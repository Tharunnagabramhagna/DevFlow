# DevFlow — Backend Architecture Report (Final Architecture v2.5.11)

> **Document Version:** 2.5.11  
> **Date:** 2026-11-07  
> **Author:** Senior Backend Architect, Payment Systems Engineer & Security Engineer  
> **Status:** Final Architectural Specification — Awaiting Human Approval Before Phase 1 Implementation

---

## Executive Summary & Version 2.5.11 Corrections

This document represents the definitive, production-grade architectural specification for **DevFlow**, an AI-powered milestone intelligence and payment orchestration platform. Version 2.5.11 eliminates duplicate refund executions via client-enforced idempotency, closes the concurrent payout-dispatch cancellation race through an atomic claim protocol, repairs refund collision calculations to derive cash across all payment-wide captures and preempt multiple initiated payouts, establishes safe lifecycle transitions for unrecorded provider reversals without double-counting, rectifies multi-tab token refresh concurrency to respect in-memory token isolation, and expands the adversarial integration test suite to 24 formal specifications.

### Version 2.5.11 Changelog & Critical Fixes

| Domain | Issue in v2.5.10 | Definitive Solution in v2.5.11 |
|---|---|---|
| **1. Duplicate Refund Execution Prevention** | `processRefund()` generated a random internal UUID for every invocation, causing retried client requests or network reconnections to execute multiple distinct refund reservations and external provider refunds | **Client-Enforced Idempotency & Consistent Replay**: Required a mandatory client-supplied idempotency key (via `Idempotency-Key` HTTP header). Prior to balance checks or reservations, `processRefund()` queries existing records by key. If found with an identical payload (`paymentId`, `captureId`, `grossAmount`, `currency`), it cleanly returns the existing refund record without re-allocating balance or cancelling payouts. If payload differs, it rejects with HTTP 409 Conflict (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`). Both initial calls and worker recovery reuse this exact key as the provider `PayPal-Request-Id`. |
| **2. INITIATED Payout Cancellation Race Closure** | A race condition existed where a payout worker could read an `INITIATED` payout, prepare to call PayPal, and concurrently have the payout cancelled by an incoming refund, leading to dual disbursement and client refund | **Atomic Payout-Dispatch Claim Protocol**: Payout workers must execute an atomic DB transaction locking the record (`FOR UPDATE`) and conditionally transitioning `INITIATED` $\rightarrow$ `PROCESSING` (recording `dispatchClaimedAt` and `workerId`) before initiating any HTTP call outside the transaction. A refund transaction can strictly only cancel payouts proven in `INITIATED` status. In-flight `PROCESSING` payouts cannot be cancelled. Ambiguous timeouts and worker crashes recover by querying PayPal Payouts by `sender_batch_id: payout.idempotencyKey`, ensuring a payout is never submitted after cancellation and never submitted twice. |
| **3. Authoritative Multi-Capture Refund Collision Calculations** | `processRefund()` calculated available cash using only the target capture's net amount, ignoring sibling captures on the invoice, pending refunds, and unrecorded provider reversal deltas; furthermore, preemption aborted after cancelling only a single initiated payout | **Payment-Wide Cash Derivation & Multi-Payout Preemption**: Derived refund collision decisions from the authoritative payment-wide aggregate calculation (`syncPaymentAggregates()`), encompassing all settled captures, completed refunds, provider reversal deltas, and disbursements across the entire milestone invoice. When an incoming refund breaches headroom, the preemption engine iterates through active `INITIATED` payouts, cancelling as many reservations as necessary until sufficient headroom is freed. In-flight `PROCESSING` payouts are never cancelled. |
| **4. Safe Lifecycle Handling for Provider Reversals** | When PayPal confirmed capture reversals externally but local `PaymentRefund` records were missing or delayed, aggregate sync left the payment marked `PAID` or `PARTIALLY_REFUNDED`, and subsequent refund ingestion risked double-counting | **Explicit Unreconciled State & Single-Deduction Hand-Off**: When unrecorded provider reversals or delta mismatches exist, the payment is placed into an explicit `MANUAL_RECONCILIATION_REQUIRED` state with `DISBURSEMENT_PAUSED`. Crucially, payments and milestones **never** transition to `PAID` while unrecorded reversals exist. Symmetrically, the provisional unrecorded delta is dynamically computed as $\max(0, \text{providerReversalGross} - \text{completedRefundGross})$, guaranteeing that when the corresponding refund row is subsequently ingested, the provisional deduction drops to zero and hands off to the permanent refund record with zero double-counting. |
| **5. Multi-Tab In-Memory Refresh Token Protocol** | The Section 2 sequence diagram claimed Tab B could read Tab A's newly issued in-memory access token, which is impossible due to browser tab memory isolation | **Independent Web-Locked Tab Refresh**: Updated Section 2 to reflect memory-isolated browser runtimes. Tabs coordinate via the Web Locks API (`navigator.locks.request('devflow_auth_refresh', ...)`). Each tab independently executes `POST /api/auth/refresh` upon acquiring the lock, receiving its own distinct in-memory access token, while the browser cookie jar automatically updates the shared HttpOnly refresh cookie (`devflow_refresh_token`). Added a 30-second token family grace period to absorb concurrent dispatch races, and formalized 401 broadcast termination on revocation. |
| **6. Adversarial Test Suite Expansion (24 Specifications)** | Test suite lacked formal specifications for payout dispatch claim races, duplicate refund retries, multi-initiated payout preemption, multi-capture refund calculations, seamless reversal hand-offs, and independent multi-tab refresh | **24 Comprehensive Integration Test Specifications**: Added formal test specifications for: concurrent payout dispatch claim vs refund cancellation (Test 16), duplicate refund retries & payload mismatch rejection (Test 13), multi-capture refund calculations (Test 14), multiple initiated payout preemption (Test 15), seamless reversal hand-off without double counting (Test 7), and independent multi-tab refresh (Test 21). |


---

## 1. Verified Repository State, Docker Setup & Frontend Integration

### 1.1 Git Audit Summary

- **Active Branch:** `main`
- **Configured Remotes:**
  ```text
  origin  https://github.com/Tharunnagabramhagna/DevFlow.git (fetch)
  origin  https://github.com/Tharunnagabramhagna/DevFlow.git (push)
  ```
- **Inspected Commit Hash:** `54813f04f38452509ec216dfa4fb4cbe411a4c0c` (`chore: initialize DevFlow monorepo project structure`)
- **Remote Freshness Status:** **UNVERIFIED (Network-Isolated Sandbox)**  
  *Inside the secure execution sandbox, outbound internet socket connections to GitHub are restricted (`getaddrinfo` failure on fetch). Therefore, this report verifies the local repository clone at commit `54813f0`. If frontend code has been authored in an un-pushed branch or separate external repository, it has not been merged into this local checkout.*

### 1.2 PostgreSQL Docker Container Setup

The repository root contains `docker-compose.yml` configured for PostgreSQL 16 Alpine:
- **Port:** `127.0.0.1:5432`
- **Database:** `devflow`
- **User:** `devflow`
- **Password:** `devflow`
- **Volume:** `postgres_data` persistent volume
- **Healthcheck:** `pg_isready -U devflow -d devflow` running every 10 seconds.

### 1.3 Detailed Frontend Filesystem Audit & Integration Contract

Inspection of `c:\Users\PAVANI\OneDrive\Desktop\Devflow\DevFlow\frontend` at commit `54813f0` establishes the following baseline:
- **Files Present:**
  - `frontend/README.md`: Contains project overview; states intended stack is React, TypeScript, Vite, Tailwind CSS; notes application code is uninitialized.
  - `frontend/public/.gitkeep`: Empty placeholder.
  - `frontend/src/`: Contains subdirectories (`assets/`, `components/`, `contexts/`, `hooks/`, `pages/`, `services/`, `styles/`, `types/`, `utils/`), all holding `.gitkeep` files.
  - No `.tsx`, `.ts`, `.jsx`, `.js`, or `package.json` files exist in this checkout.

#### Required Frontend Integration Contracts
When frontend application code is implemented or merged, it must adhere strictly to these backend contracts:
1. **In-Memory Access Tokens:** The frontend auth state store (React Context / Zustand) must store the 15-minute `accessToken` in JavaScript memory only. Never persist access tokens in `localStorage` or `sessionStorage`.
2. **Cookie Credentials:** HTTP clients (Axios / Fetch) must set `withCredentials: true` (`credentials: 'include'`) to pass the HttpOnly `devflow_refresh_token` and `devflow_linking_challenge` cookies.
3. **Cross-Tab Concurrency Serialization:** Axios response interceptors must coordinate token refreshes using `navigator.locks.request('devflow_auth_refresh', ...)` to prevent multi-tab refresh collisions.
4. **CSRF Header:** All mutating cookie-dependent requests (`POST`, `PATCH`, `DELETE`) must include the custom header `X-Requested-With: XMLHttpRequest`.
5. **Uniform Error Envelope:** Frontend UI components must consume the uniform `ApiErrorResponse` schema (`error.code`, `error.message`, `error.details`).
6. **Anti-Self-Approval UI Logic:** Milestone approval buttons must be hidden or disabled if the authenticated user is not `project.clientId` or if they are the milestone submitter or lead developer.


---

## 2. Hardened Authentication & Token Lifecycle Architecture

### 2.1 Refresh Token Concurrency & Atomic Rotation Protocol

```mermaid
sequenceDiagram
    autonumber
    actor TabA as Browser Tab A
    actor TabB as Browser Tab B
    participant API as DevFlow Auth Controller
    participant DB as PostgreSQL Database

    Note over TabA,TabB: Web Locks API coordinates tabs (navigator.locks)
    TabA->>TabA: Acquire lock 'devflow_auth_refresh'
    TabA->>API: POST /api/auth/refresh (Shared Cookie: Token1)
    TabB->>TabB: Waits for lock 'devflow_auth_refresh'
    
    API->>API: Compute tokenHash = SHA-256(Token1)
    API->>DB: BEGIN TRANSACTION (SERIALIZABLE / ROW LOCK)
    API->>DB: SELECT * FROM refresh_tokens WHERE token_hash = :hash FOR UPDATE
    
    alt Token valid and unexpired
        API->>API: Generate successorId = uuid(), successorRaw = crypto.randomBytes(32) [Token2]
        API->>DB: INSERT INTO refresh_tokens (id, family_id, token_hash, user_id, expires_at) VALUES (:successorId, ...)
        API->>DB: UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token_id = :successorId WHERE id = :currentTokenId AND revoked_at IS NULL
        API->>DB: COMMIT
        API-->>TabA: 200 OK + Set-Cookie: devflow_refresh_token [Token2] + { accessToken: AccessTokenA }
    else Token already rotated within 30s grace period
        API->>DB: Fetch active successor token for family
        API->>DB: COMMIT
        API-->>TabA: 200 OK + { accessToken: AccessTokenA }
    else Token revoked outside grace period
        API->>DB: UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = :familyId
        API->>DB: COMMIT
        API-->>TabA: 401 Unauthorized (TOKEN_REUSE_DETECTED - Family Revoked)
    end
    
    TabA->>TabA: Store AccessTokenA in Tab A memory
    TabA->>TabA: Release lock 'devflow_auth_refresh'
    
    Note over TabB: Tab B acquires lock 'devflow_auth_refresh'
    TabB->>API: POST /api/auth/refresh (Shared Cookie: Token2 updated in browser cookie jar)
    API->>API: Compute tokenHash = SHA-256(Token2)
    API->>DB: BEGIN TRANSACTION (ROW LOCK)
    API->>DB: Validate Token2 & rotate to Token3
    API->>DB: COMMIT
    API-->>TabB: 200 OK + Set-Cookie: devflow_refresh_token [Token3] + { accessToken: AccessTokenB }
    TabB->>TabB: Store AccessTokenB in Tab B memory
    TabB->>TabB: Release lock 'devflow_auth_refresh'
    TabB->>API: GET /api/users/me (Authorization: Bearer AccessTokenB)
```

#### Token Storage & Multi-Tab Isolation Rules
- **Memory Isolation Across Browser Tabs:** In modern web browsers, JavaScript execution environments are strictly isolated per tab/worker. Tab B **cannot** inspect or share Tab A's in-memory variables.
- **Independent Tab Refresh Execution:** When multiple tabs experience access token expiration concurrently, browser tabs coordinate via the Web Locks API (`navigator.locks.request('devflow_auth_refresh', ...)`). Each tab must independently call `POST /api/auth/refresh` upon acquiring the lock, receiving its own distinct in-memory access token, while the browser's native shared cookie jar automatically manages the rotating HttpOnly refresh cookie (`devflow_refresh_token`).
- **30-Second Token Family Rotation Grace Period:** To eliminate race conditions where a tab's HTTP refresh request was dispatched immediately prior to a sibling tab's rotation, the backend permits rotated tokens to issue a successor access token if presented within a 30-second temporal window of `replaced_by_token_id` creation. Submissions outside this grace period trigger automatic token family revocation (`TOKEN_REUSE_DETECTED`).
- **Failure & Revocation Handling:** If any tab receives a `401 Unauthorized` (due to refresh token expiration, revocation, or reuse detection), the tab purges its local memory, broadcasts a termination signal across all open tabs via `BroadcastChannel('devflow_auth')`, and redirects the user to `/login`.
- **Token Storage Decision:**
  - **Access Tokens:** Returned **strictly in JSON response bodies** (`{ accessToken: string }`) for memory-only storage. Lifespan: 15 minutes.
  - **Refresh Tokens:** Stored **strictly in HttpOnly, SameSite=Strict cookies** (`devflow_refresh_token`). Lifespan: 7 days.
  - **No access tokens are ever persisted in cookies or Web Storage (`localStorage` / `sessionStorage`).**

---

### 2.2 Secure OAuth State, Exchange Codes & Account Linking

#### OAuth State Atomic Consumption
```sql
UPDATE oauth_states 
SET used_at = NOW() 
WHERE state_hash = :hash AND used_at IS NULL AND expires_at > NOW() 
RETURNING *;
```

#### OAuth Exchange Code Atomic Consumption
```sql
UPDATE oauth_exchange_codes 
SET used_at = NOW() 
WHERE code_hash = :codeHash AND used_at IS NULL AND expires_at > NOW() 
RETURNING *;
```


---

## 3. Cookie, CORS & CSRF Configuration

### 3.1 Cookie Attribute Alignment
```typescript
// backend/src/config/cookies.ts
export const getCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    refreshToken: {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    oauthState: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/api/auth/github',
      maxAge: 10 * 60 * 1000,
    },
    linkingChallenge: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/api/auth/oauth/link-account',
      maxAge: 10 * 60 * 1000,
    },
  };
};

export const clearCookieConfig = (cookieName: 'refreshToken' | 'oauthState' | 'linkingChallenge') => {
  const config = getCookieConfig()[cookieName];
  return {
    path: config.path,
    sameSite: config.sameSite,
    secure: config.secure,
    httpOnly: config.httpOnly,
  };
};
```


---

## 4. Project Creator Ownership, Counterparties & Anti-Self-Approval

### 4.1 Explicit Project Creator Ownership & Atomic Creation

Every project maintains an explicit, immutable link to its creator:
- **`createdById` Field:** Foreign key to `User(id)` with `onDelete: Restrict`.
- **Atomic Creation Protocol:**
  ```typescript
  export async function createProject(data: CreateProjectInput, user: AuthUser) {
    return await prisma.$transaction(async (tx) => {
      // Step 1: Create project with creator relation
      const project = await tx.project.create({
        data: {
          title: data.title,
          description: data.description,
          brief: data.brief,
          budget: data.budget,
          currency: data.currency || 'USD',
          createdById: user.id,
          clientId: user.role === 'CLIENT' ? user.id : null,
          leadDeveloperId: user.role === 'FREELANCER' ? user.id : null,
        },
      });

      // Step 2: Grant ProjectMemberRole.OWNER to creator
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: user.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      return project;
    });
  }
  ```

---

### 4.2 Database-Level Counterparty Separation

```sql
-- database/prisma/migrations/20261107_counterparty_separation_check/migration.sql
ALTER TABLE projects 
ADD CONSTRAINT check_counterparty_separation 
CHECK ("clientId" IS NULL OR "leadDeveloperId" IS NULL OR "clientId" <> "leadDeveloperId");
```

---

### 4.3 Robust Invitation Acceptance Transaction Flow

```typescript
export async function acceptInvitation(tokenHash: string, user: AuthUser) {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Pre-lookup invitation metadata
    const inviteMeta = await tx.projectInvitation.findUnique({
      where: { tokenHash },
      select: { id: true, projectId: true, email: true, role: true, status: true, expiresAt: true },
    });

    if (!inviteMeta || inviteMeta.status !== 'PENDING' || inviteMeta.expiresAt <= new Date()) {
      throw new GoneError("Invitation is invalid, has expired, or has already been consumed");
    }

    if (user.email.toLowerCase() !== inviteMeta.email.toLowerCase()) {
      throw new ForbiddenError("This invitation was issued to a different email address");
    }

    // Step 2: Deterministic Lock Order: Lock Project Row First
    const [project] = await tx.$queryRaw<Project[]>`
      SELECT id, "clientId", "leadDeveloperId" FROM projects WHERE id = ${inviteMeta.projectId} FOR UPDATE
    `;
    if (!project) {
      throw new NotFoundError("Associated project not found");
    }

    // Step 3: Atomic Conditional Update on Invitation Record
    const updateResult = await tx.projectInvitation.updateMany({
      where: {
        id: inviteMeta.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    if (updateResult.count !== 1) {
      throw new GoneError("Invitation has already been consumed by a concurrent request or has expired");
    }

    // Step 4: Validate Counterparty Slot Availability & Non-Identity
    if (inviteMeta.role === 'CLIENT') {
      if (project.clientId !== null && project.clientId !== user.id) {
        throw new ConflictError("Project Client counterparty has already been assigned to another user");
      }
      if (project.leadDeveloperId === user.id) {
        throw new ConflictError("Cannot accept Client invitation while assigned as Lead Developer");
      }
    } else if (inviteMeta.role === 'LEAD_DEVELOPER') {
      if (project.leadDeveloperId !== null && project.leadDeveloperId !== user.id) {
        throw new ConflictError("Project Lead Developer counterparty has already been assigned to another user");
      }
      if (project.clientId === user.id) {
        throw new ConflictError("Cannot accept Lead Developer invitation while assigned as Client");
      }
    }

    // Step 5: Always Assign Counterparty on Project (New or Existing Member)
    await tx.project.update({
      where: { id: project.id },
      data: inviteMeta.role === 'CLIENT'
        ? { clientId: user.id }
        : inviteMeta.role === 'LEAD_DEVELOPER'
          ? { leadDeveloperId: user.id }
          : {},
    });

    // Step 6: Create or Update ProjectMember Record
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      create: {
        projectId: project.id,
        userId: user.id,
        role: inviteMeta.role as ProjectMemberRole,
      },
      update: {
        role: inviteMeta.role as ProjectMemberRole,
      },
    });

    return { success: true, projectId: project.id };
  });
}
```


---

## 5. Authoritative Capture and Refund Accounting & Payout Engine

### 5.1 Primary Source of Truth: Capture & Refund Ledger

To ensure absolute financial integrity, `PaymentCapture` and `PaymentRefund` records constitute the **immutable primary ledger** for all settlement events. `Payment` aggregate fields (`settledAmount`, `feeAmount`, `netReceivedAmount`, `refundedAmount`, `netRefundDeducted`) are **derived materialized cached views** recalculated from raw ledger records within the exact same database transaction that ingests captures, processes refunds, or executes reconciliation repair.

#### Explicit Financial State Machines
DevFlow strictly distinguishes seven independent financial and lifecycle state machines:

1. **`CaptureStatus` (Provider Capture State):** Reflects provider-confirmed lifecycle of an individual capture transaction:
   - `COMPLETED`: Funds successfully settled into platform merchant PayPal account.
   - `PENDING`: Capture in-flight, clearing with issuing bank, or held by bank rails. Blocks payout eligibility.
   - `REFUNDED`: Provider indicates full reversal/refund has occurred.
   - `PARTIALLY_REFUNDED`: Provider indicates one or more partial refunds have occurred.
   - `DENIED` / `FAILED`: Capture was rejected or failed. Blocks payout eligibility; requires manual inspection.
   - `UNKNOWN`: Provider status unrecognized. Preserves full payload in `rawResponse`, blocks payout eligibility, and halts disbursements.
2. **`CaptureFeeStatus` (Provider Fee Verification State):**
   - `VERIFIED`: PayPal API confirmed exact fee and net breakdown. Eligible for payout calculation.
   - `PENDING_CONFIRMATION`: Gross capture settled, but fee confirmation webhook is pending. Contributes zero to verified net cash; pauses payouts.
   - `MANUAL_REVIEW_REQUIRED`: Provider fee cannot be verified or exceeds expected tolerances. Requires admin review.
3. **`RefundStatus` (Individual Refund Execution Lifecycle):**
   - `PENDING`: Refund submitted to provider or awaiting completion. Reserves gross and fee-reversal headroom.
   - `COMPLETED`: Confirmed successful refund. Deductions become permanent.
   - `FAILED` / `CANCELLED`: Refund aborted or rejected. All reservations released immediately.
4. **`RefundFeeReversalStatus` (Fee Reversal Verification State):**
   - `VERIFIED`: Confirmed fee returned by PayPal to platform.
   - `PENDING_CONFIRMATION`: Conservative assumption of zero fee reversal; pauses payouts until verified.
   - `NO_FEE_REVERSAL`: Confirmed that PayPal retained 100% of the original fee (reversal = 0.00).
5. **`PaymentStatus` (Invoice & Milestone Contractual Lifecycle):**
   - `PENDING`, `CREATING`, `DRAFT`, `SCHEDULED`, `SENDING`, `SENT`, `PAID`, `PAYMENT_PENDING`, `PARTIALLY_PAID`, `PARTIALLY_REFUNDED`, `CANCELLED`, `FAILED`, `REFUNDED`, `MARKED_AS_REFUNDED`, `MANUAL_RECONCILIATION_REQUIRED`.
6. **`PaymentPayoutStatus` (Payment Disbursement Ledger State):**
   - `AWAITING_PAYMENT`, `PLATFORM_HELD`, `DISBURSEMENT_IN_PROGRESS`, `PARTIALLY_DISBURSED`, `DISBURSED`, `DISBURSEMENT_PAUSED`, `PAYOUT_FAILED`.
7. **`PayoutRecordStatus` (Individual Payout Transfer Lifecycle):**
   - `INITIATED`: Headroom reserved in platform ledger; not yet submitted to PayPal Payouts API or bank. Can be preemptively cancelled.
   - `PROCESSING`: In-flight in PayPal Payouts batch API. Irreversible transfer.
   - `DISBURSED`: Confirmed deposited into freelancer PayPal wallet or bank account.
   - `FAILED`: Provider rejected payout transfer. Reservation released.
   - `CANCELLED`: Cancelled prior to API transmission (e.g. superseded by urgent refund).

#### Primary Ledger Prisma Model Definitions
All Prisma model fields include explicit `@map("snake_case")` attributes to ensure 100% alignment with raw PostgreSQL queries:

```prisma
enum CaptureStatus {
  COMPLETED
  PENDING
  REFUNDED
  PARTIALLY_REFUNDED
  DENIED
  FAILED
  UNKNOWN
}

enum CaptureFeeStatus {
  VERIFIED
  PENDING_CONFIRMATION
  MANUAL_REVIEW_REQUIRED
}

enum RefundStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum RefundFeeReversalStatus {
  VERIFIED
  PENDING_CONFIRMATION
  NO_FEE_REVERSAL
}

enum PayoutProvider {
  PAYPAL_PAYOUTS
  MANUAL_TRANSFER
}

model PaymentCapture {
  id                 String           @id @default(uuid())
  paymentId          String           @map("payment_id")
  paypalCaptureId    String           @unique @db.VarChar(128) @map("paypal_capture_id")
  status             CaptureStatus    @default(PENDING)
  grossAmount        Decimal          @db.Decimal(12, 2) @map("gross_amount")
  feeAmount          Decimal?         @db.Decimal(12, 2) @map("fee_amount")
  netAmount          Decimal?         @db.Decimal(12, 2) @map("net_amount")
  currency           String           @db.VarChar(3)
  feeStatus          CaptureFeeStatus @default(PENDING_CONFIRMATION) @map("fee_status")
  capturedAt         DateTime         @map("captured_at")
  rawResponse        Json             @map("raw_response")
  createdAt          DateTime         @default(now()) @map("created_at")
  updatedAt          DateTime         @updatedAt @map("updated_at")

  payment            Payment          @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  refunds            PaymentRefund[]

  @@unique([paymentId, id], name: "payment_capture_ownership_idx")
  @@index([paymentId])
  @@map("payment_captures")
}

model PaymentRefund {
  id                 String                  @id @default(uuid())
  paymentId          String                  @map("payment_id")
  captureId          String                  @map("capture_id")
  paypalRefundId     String?                 @unique @db.VarChar(128) @map("paypal_refund_id")
  idempotencyKey     String                  @unique @db.VarChar(128) @map("idempotency_key")
  status             RefundStatus            @default(PENDING)
  grossAmount        Decimal                 @db.Decimal(12, 2) @map("gross_amount")
  feeReversalStatus  RefundFeeReversalStatus @default(PENDING_CONFIRMATION) @map("fee_reversal_status")
  feeReversalAmount  Decimal?                @db.Decimal(12, 2) @map("fee_reversal_amount")
  netDeductedAmount  Decimal?                @db.Decimal(12, 2) @map("net_deducted_amount")
  currency           String                  @db.VarChar(3)
  reason             String?
  rawResponse        Json?                   @map("raw_response")
  requestedAt        DateTime                @default(now()) @map("requested_at")
  refundedAt         DateTime?               @map("refunded_at")
  createdAt          DateTime                @default(now()) @map("created_at")
  updatedAt          DateTime                @updatedAt @map("updated_at")

  payment            Payment                 @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  capture            PaymentCapture          @relation(fields: [captureId], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@index([captureId])
  @@map("payment_refunds")
}

model PayoutRecord {
  id                     String             @id @default(uuid())
  paymentId              String             @map("payment_id")
  provider               PayoutProvider     @default(PAYPAL_PAYOUTS)
  providerPayoutBatchId  String?            @db.VarChar(128) @map("provider_payout_batch_id")
  providerItemId         String?            @unique @db.VarChar(128) @map("provider_item_id")
  amount                 Decimal            @db.Decimal(12, 2)
  currency               String             @default("USD") @db.VarChar(3)
  beneficiaryEmail       String             @map("beneficiary_email")
  status                 PayoutRecordStatus @default(INITIATED)
  idempotencyKey         String             @unique @db.VarChar(128) @map("idempotency_key")
  transferReference      String?            @db.VarChar(255) @map("transfer_reference")
  adminUserId            String             @map("admin_user_id")
  evidenceDocumentUrl    String?            @map("evidence_document_url")
  failureReason          String?            @map("failure_reason")
  reconciliationHistory  Json               @default("[]") @map("reconciliation_history")
  rawResponse            Json?              @map("raw_response")
  initiatedAt            DateTime           @default(now()) @map("initiated_at")
  disbursedAt            DateTime?          @map("disbursed_at")
  cancelledAt            DateTime?          @map("cancelled_at")
  createdAt              DateTime           @default(now()) @map("created_at")
  updatedAt              DateTime           @updatedAt @map("updated_at")

  payment                Payment            @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  adminUser              User               @relation("AdminAuthorizedPayouts", fields: [adminUserId], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@index([adminUserId])
  @@map("payout_records")
}
```

---

### 5.2 Decoupled Accounting: Gross Settlement vs Fee Verification & Capture Proceeds Retention

DevFlow strictly adheres to double-entry ledger principles for all settlement events:

1. **`settledAmount` (Gross Settlement):**
   Sum of all provider-confirmed settled captures (`COMPLETED`, `PARTIALLY_REFUNDED`, `REFUNDED`):
   $$\text{settledAmount} = \sum_{c \in \text{Captures}, c.status \in \{\text{'COMPLETED'}, \text{'PARTIALLY_REFUNDED'}, \text{'REFUNDED'}\}} c.grossAmount$$
   When $\text{settledAmount} \ge \text{snapshotAmount}$, the invoice transitions to **`PAID`**, and the milestone transitions to **`PAID`** (contractual milestone delivery is satisfied).
2. **`netReceivedAmount` (Historical Verified Net Cash Proceeds):**
   Sum of original `net_amount` for all settled captures where `feeStatus = 'VERIFIED'`:
   $$\text{netReceivedAmount} = \sum_{c \in \text{Captures}, c.status \in \{\text{'COMPLETED'}, \text{'PARTIALLY_REFUNDED'}, \text{'REFUNDED'}\} \land c.feeStatus = \text{'VERIFIED'}} c.netAmount$$
   **Critical Invariant:** A capture's original gross settlement and verified net proceeds remain permanently recorded in the capture ledger, even if the capture subsequently undergoes a partial or full refund. Deductions to cash are driven **strictly** through separate, identifiable negative ledger events (`PaymentRefund` records).
3. **Refunds & Reversals as Negative Ledger Events:**
   Every partial or full refund is recorded in `PaymentRefund`. Cash deductions are calculated from completed and pending refund records:
   $$\text{netRefundDeducted} = \sum_{r \in \text{Refunds}, r.status = \text{'COMPLETED'}} r.netDeductedAmount$$
   This prevents double-counting: when both the capture status (`PARTIALLY_REFUNDED`) and `PaymentRefund` records exist, the deduction is applied exactly once through the refund records.

---

### 5.3 Dual Payout Execution Modes: PayPal Payouts vs. Manual Transfers

DevFlow formally supports **two distinct, auditable payout execution modes**:

```mermaid
stateDiagram-v2
    [*] --> INITIATED: Admin Initiates Payout (Reserves Headroom, status = INITIATED)
    
    state "Mode A: Automated PayPal Payouts (provider = PAYPAL_PAYOUTS)" as ModeA {
        INITIATED --> PROCESSING: Atomic Dispatch Claim (DB Row Lock + Commit before HTTP call)
        PROCESSING --> DISBURSED: Webhook PAYMENT.PAYOUTS-ITEM.SUCCEEDED (Settlement Confirmed)
        PROCESSING --> FAILED: Webhook FAILED or Recovery Timeout with Unsubmitted Batch (Releases Reservation)
    }
    
    state "Mode B: Authorized Manual Transfer (provider = MANUAL_TRANSFER)" as ModeB {
        INITIATED --> DISBURSED: Admin /confirm (Requires transferReference + evidenceDocumentUrl + ActivityLog)
        INITIATED --> CANCELLED: Admin /cancel (Releases Reservation + ActivityLog)
    }
    
    INITIATED --> CANCELLED: Preempted by Incoming Client Refund (Proven Unsubmitted + ActivityLog)
    CANCELLED --> [*]
    FAILED --> [*]
    DISBURSED --> [*]
```

#### Rules and Invariants for Payout Execution Modes:
1. **Mode A — Automated PayPal Payouts (`provider = 'PAYPAL_PAYOUTS'`):**
   - **Initiation (`POST /api/payments/:id/payout/initiate`):** Generates UUID `idempotencyKey`, creates `PayoutRecord` in `INITIATED` status, commits DB reservation, reserving headroom in the platform ledger.
   - **Atomic Payout-Dispatch Claim Protocol & Anti-Race Guarantee:**
     - Before making an external network call to PayPal Payouts API, a background worker or dispatcher **must claim** the payout in an atomic database transaction using a row-level lock (`SELECT ... FOR UPDATE`).
     - The worker conditionally updates `status = PROCESSING` and records dispatch metadata (`dispatchClaimedAt`, `workerId`).
     - The claim transaction commits and releases row locks **strictly prior** to transmitting the HTTP request.
     - **Preemption Impossibility:** An incoming client refund can **only** preempt and cancel payouts that are strictly in `INITIATED` status. Once a payout is claimed into `PROCESSING`, it is proven in-flight in provider banking rails and **can never be cancelled or aborted**.
   - **Crash & Ambiguous Timeout Recovery:**
     - External HTTP dispatch to PayPal supplies `sender_batch_id: payout.idempotencyKey`.
     - If the worker crashes or the HTTP request encounters a network drop / socket timeout, the payout remains in `PROCESSING` status (preserving its headroom reservation).
     - A periodic reconciliation worker scans for `PROCESSING` payouts older than 5 minutes and queries PayPal Payouts API using `sender_batch_id = payout.idempotencyKey`.
     - If PayPal confirms the batch exists and is queued/executed, the worker records `providerPayoutBatchId`.
     - If PayPal returns 404 (confirming the batch was never received), the worker safely transitions `status = FAILED` with `failureReason = 'DISPATCH_TIMEOUT_UNSUBMITTED'`, releasing the headroom reservation.
     - **Invariant:** A payout can **never be submitted after cancellation** (claim fails if status is `CANCELLED`), and can **never be submitted twice** (PayPal deduplicates by `sender_batch_id`).
   - **Settlement Confirmation:** Transitions to `DISBURSED` **only** upon cryptographic signature verification of webhook `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`.
   - **Provider Failure:** Webhook `PAYMENT.PAYOUTS-ITEM.FAILED`, `BLOCKED`, or `RETURNED` transitions status to `FAILED`, records `failureReason`, logs to `ActivityLog` (`PAYOUT_FAILED`), and automatically releases the headroom reservation.

2. **Mode B — Authorized Manual Transfer (`provider = 'MANUAL_TRANSFER'`):**
   - **Initiation (`POST /api/payments/:id/payout/initiate` with `provider: 'MANUAL_TRANSFER'`):** Creates `PayoutRecord` in `INITIATED` status with `adminUserId`, reserving headroom in the platform ledger. Logs to `ActivityLog` (`PAYOUT_INITIATED`).
   - **Confirmation (`POST /api/payments/:id/payout/confirm`):** Admin executes external bank wire or transfer, and must submit:
     - `transferReference`: Bank IMAD/OMAD, transaction hash, or wire reference ID.
     - `evidenceDocumentUrl`: Uploaded bank receipt or PDF voucher.
     - `notes`: Mandatory audit explanation.
   - **Strict Verification Constraint:** A manual transfer **cannot** transition to `DISBURSED` without non-empty `transferReference`, non-empty `evidenceDocumentUrl`, and an authenticated `adminUserId`. An immutable entry is appended to `reconciliationHistory` and logged to `ActivityLog` (`action = 'PAYOUT_CONFIRMED'`).
   - **Cancellation (`POST /api/payments/:id/payout/cancel`):** Admin can abort an unexecuted manual transfer in `INITIATED` status, safely releasing the reservation and recording an immutable entry in `ActivityLog` (`action = 'PAYOUT_CANCELLED'`).

3. **Universal Non-Disbursement Constraint:**
   **Under no circumstances is any payout marked `DISBURSED` without either (a) authoritative PayPal webhook signature verification, or (b) verified manual transfer evidence and audit trail records.**

---

### 5.4 Hierarchical Lock Order & Deadlock Prevention

To eliminate database deadlock vulnerabilities across concurrent webhooks, reconciliation workers, client refunds, and payout initiations, all backend services acquire row locks in this strict hierarchical sequence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DETERMINISTIC HIERARCHICAL LOCK ORDER                │
├───────┬──────────────────────┬─────────────────────────────────────────┤
│ Tier 1│ Payment              │ SELECT id FROM payments                 │
│       │                      │ WHERE id = :paymentId FOR UPDATE        │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ Tier 2│ PaymentCapture(s)    │ SELECT id FROM payment_captures         │
│       │                      │ WHERE id IN (...) ORDER BY id ASC       │
│       │                      │ FOR UPDATE                              │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ Tier 3│ PaymentRefund(s)     │ SELECT id FROM payment_refunds          │
│       │                      │ WHERE payment_id = :paymentId           │
│       │                      │ ORDER BY id ASC FOR UPDATE              │
├───────┼──────────────────────┼─────────────────────────────────────────┤
│ Tier 4│ PayoutRecord(s)      │ SELECT id FROM payout_records           │
│       │                      │ WHERE payment_id = :paymentId           │
│       │                      │ ORDER BY id ASC FOR UPDATE              │
└───────┴──────────────────────┴─────────────────────────────────────────┘
```

---

### 5.5 Database-Enforced Refund Ownership & Negative Proof Test

Prisma model `PaymentCapture` defines `@@unique([paymentId, id], name: "payment_capture_ownership_idx")`. In the generated baseline migration, PostgreSQL creates this composite unique index. 

The custom migration attaches the composite foreign key constraint directly without duplicate unique index declaration:

```sql
-- database/prisma/migrations/20261107_refund_capture_ownership_check/migration.sql
-- Enforce composite foreign key constraint on payment_refunds
-- Relies on existing unique constraint "payment_capture_ownership_idx" on payment_captures(payment_id, id) generated by Prisma
ALTER TABLE payment_refunds
ADD CONSTRAINT fk_refund_capture_payment_ownership
FOREIGN KEY (payment_id, capture_id)
REFERENCES payment_captures (payment_id, id)
ON DELETE RESTRICT;
```

#### Negative Proof Test Specification
```typescript
// backend/tests/refundOwnership.test.ts [Specification only — Proposed, not yet executed]
it("rejects refund referencing a capture from another payment with SQL 23503", async () => {
  const paymentA = await createTestPayment();
  const paymentB = await createTestPayment();
  const captureB = await createTestCapture(paymentB.id);

  await expect(
    prisma.paymentRefund.create({
      data: {
        paymentId: paymentA.id, // Mismatched payment
        captureId: captureB.id, // Belongs to paymentB
        idempotencyKey: "test-refund-uuid-1",
        grossAmount: new Decimal("50.00"),
        currency: "USD",
        requestedAt: new Date(),
      },
    })
  ).rejects.toThrow(/foreign key constraint/i);
});
```

---

### 5.6 Pending-Refund Reservation Cap & Cumulative Fee-Reversal Limits

1. **Comprehensive Refund Gross Reservation Cap:**
   Enforces that the sum of `COMPLETED` and `PENDING` refunds cannot exceed capture gross balance:
   $$\sum_{r \in \text{Refunds(capture)}, r.status \in \{\text{'COMPLETED'}, \text{'PENDING'}\}} r.grossAmount + \text{newRefund.grossAmount} \le \text{capture.grossAmount}$$
   - `PENDING` refunds immediately reserve refundable balance.
   - `FAILED` or `CANCELLED` refunds release reservations exactly once.

2. **Transactionally Enforced Cumulative Fee-Reversal Limit:**
   For each individual capture, the sum of all confirmed and pending fee reversals across all associated refunds can never exceed the original capture fee:
   $$\sum_{r \in \text{Refunds(capture)}, r.status \in \{\text{'COMPLETED'}, \text{'PENDING'}\}} (r.feeReversalAmount \text{ or } 0) \le \text{capture.feeAmount}$$
   - **Reservation:** When a refund is initiated in `PENDING` status with an estimated or pending fee reversal, it temporarily reserves fee-reversal headroom against `capture.feeAmount`.
   - **Release:** If the refund fails (`FAILED`) or is cancelled (`CANCELLED`), the reserved fee-reversal amount is released immediately.
   - **Verification:** When PayPal confirms the fee reversal, `r.status = COMPLETED` and `r.feeReversalStatus = VERIFIED`, converting the reservation into a confirmed reduction of platform payment processing fees.
   - **Concurrency Serialization:** Tier 2 row locking on `PaymentCapture` (`FOR UPDATE`) serializes all refund requests against the same capture, ensuring two concurrent requests cannot simultaneously read unreserved balance and over-allocate fee reversals.

3. **Refund Fee-Reversal State Semantics:**
   - `VERIFIED`: Confirmed non-negative fee reversal from PayPal ($0 \le feeReversalAmount \le \text{capture.feeAmount}$). $\text{netDeductedAmount} = \text{grossAmount} - \text{feeReversalAmount}$.
   - `NO_FEE_REVERSAL`: Confirmed PayPal retained entire fee (reversal = 0.00). $\text{netDeductedAmount} = \text{grossAmount} - 0.00$.
   - `PENDING_CONFIRMATION`: Conservative deduction assumes zero fee reversal ($\text{netDeductedAmount} = \text{grossAmount}$) and **strictly pauses disbursements** (`payoutStatus = DISBURSEMENT_PAUSED`) until fee reversal reconciliation completes.

---

### 5.7 Financial Amount Invariants (Database vs Transactional)

#### Database-Level Row Constraints
```sql
-- database/prisma/migrations/20261107_financial_amount_positive_checks/migration.sql
ALTER TABLE payments 
ADD CONSTRAINT check_payment_positive_amounts 
CHECK ("snapshotAmount" > 0 AND "settledAmount" >= 0 AND "feeAmount" >= 0 AND "netReceivedAmount" >= 0 AND "refundedAmount" >= 0);

ALTER TABLE payment_captures 
ADD CONSTRAINT check_capture_positive_amounts 
CHECK (gross_amount > 0 AND (fee_amount IS NULL OR fee_amount >= 0) AND (net_amount IS NULL OR net_amount >= 0));

ALTER TABLE payment_refunds 
ADD CONSTRAINT check_refund_positive_amounts 
CHECK (gross_amount > 0 AND (fee_reversal_amount IS NULL OR fee_reversal_amount >= 0) AND (net_deducted_amount IS NULL OR net_deducted_amount >= 0));

ALTER TABLE payout_records 
ADD CONSTRAINT check_payout_positive_amount 
CHECK (amount > 0);
```

#### Transactional Cross-Row Invariants (Enforced via Tiered Locking)
1. **Invoice Cap:** $\sum \text{grossAmount} \le \text{snapshotAmount}$. Excess triggers `MANUAL_RECONCILIATION_REQUIRED`.
2. **Capture Refund Cap:** $\sum_{\{\text{COMPLETED}, \text{PENDING}\}} r.grossAmount \le \text{capture.grossAmount}$.
3. **Cumulative Fee Reversal Cap:** $\sum_{\{\text{COMPLETED}, \text{PENDING}\}} r.feeReversalAmount \le \text{capture.feeAmount}$.
4. **Capture Balance Reconciliation:** For `COMPLETED`, `PARTIALLY_REFUNDED`, and `REFUNDED` captures with `feeStatus = VERIFIED`: $|\text{grossAmount} - (\text{feeAmount} + \text{netAmount})| \le 0.01$.
5. **Currency Uniformity:** `payment.snapshotCurrency === capture.currency === refund.currency === payout.currency`.

---

### 5.8 Authoritative Aggregate Derivation, Provider Reversal Reconciliation & Lifecycle Synchronization

```typescript
// backend/src/modules/payments/reconciliation.service.ts
import { PrismaClient, Prisma, PaymentStatus, PaymentPayoutStatus, CaptureFeeStatus, RefundStatus, RefundFeeReversalStatus, PayoutRecordStatus, MilestoneStatus } from '@prisma/client';
import Decimal from 'decimal.js';

export interface AggregateSyncResult {
  paymentId: string;
  repaired: boolean;
  paused: boolean;
  pauseReasons: string[];
  discrepancies: string[];
  grossCapturedTotal: Decimal;
  verifiedNetReceivedTotal: Decimal;
  feeTotal: Decimal;
  grossRefundTotal: Decimal;
  netRefundDeductedTotal: Decimal;
  unrecordedReversalsGrossTotal: Decimal;
  unrecordedReversalsNetDeduction: Decimal;
  activePayoutReservationsTotal: Decimal;
  confirmedDisbursementsTotal: Decimal;
  unverifiedCapturesCount: number;
  manualReviewCapturesCount: number;
  pendingCapturesCount: number;
  inconsistentCapturesCount: number;
  anomalousCapturesCount: number;
  unknownCapturesCount: number;
  pendingRefundsCount: number;
  pendingFeeReversalsCount: number;
  excessiveFeeReversalsCount: number;
  hasUnreconciledProviderReversal: boolean;
  ledgerDeficit: boolean;
  deficitAmount: Decimal;
  availablePayoutHeadroom: Decimal;
}

export async function syncPaymentAggregates(tx: Prisma.TransactionClient, paymentId: string): Promise<AggregateSyncResult> {
  // Tier 1: Lock Payment (Using exact PostgreSQL quoted identifier "snapshotCurrency")
  const [payment] = await tx.$queryRaw<any[]>`
    SELECT id, "milestoneId", "snapshotAmount", "paidAt", status, "payoutStatus", "snapshotCurrency", "reconciliationNotes" 
    FROM payments 
    WHERE id = ${paymentId} FOR UPDATE
  `;
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  // Tier 2: Lock Captures (Hierarchical Order)
  const captures = await tx.$queryRaw<any[]>`
    SELECT * FROM payment_captures WHERE payment_id = ${paymentId} ORDER BY id ASC FOR UPDATE
  `;

  // Tier 3: Lock Refunds
  const refunds = await tx.$queryRaw<any[]>`
    SELECT * FROM payment_refunds WHERE payment_id = ${paymentId} ORDER BY id ASC FOR UPDATE
  `;

  // Tier 4: Lock Payouts
  const payouts = await tx.$queryRaw<any[]>`
    SELECT * FROM payout_records WHERE payment_id = ${paymentId} ORDER BY id ASC FOR UPDATE
  `;

  const discrepancies: string[] = [];
  const pauseReasons: string[] = [];

  // Deterministic Derivations: Exhaustive Capture Audit & Proceeds Retention
  let grossCaptured = new Decimal(0);
  let verifiedNet = new Decimal(0);
  let verifiedFees = new Decimal(0);
  let unverifiedCaptures = 0;
  let manualReviewCaptures = 0;
  let pendingCaptures = 0;
  let inconsistentCaptures = 0;
  let anomalousCaptures = 0;
  let unknownCaptures = 0;

  for (const c of captures) {
    // Validate Currency Uniformity against payment.snapshotCurrency
    if (c.currency !== payment.snapshotCurrency) {
      discrepancies.push(`CAPTURE_${c.id}_CURRENCY_MISMATCH_${c.currency}_VS_${payment.snapshotCurrency}`);
      anomalousCaptures++;
    }

    switch (c.status) {
      case 'COMPLETED':
      case 'PARTIALLY_REFUNDED':
      case 'REFUNDED': {
        // All settled captures permanently maintain gross and verified net proceeds in historical capture ledger
        grossCaptured = grossCaptured.plus(new Decimal(c.gross_amount));

        if (c.fee_status === CaptureFeeStatus.VERIFIED) {
          if (c.fee_amount === null || c.net_amount === null) {
            inconsistentCaptures++;
            discrepancies.push(`CAPTURE_${c.id}_VERIFIED_MISSING_FEE_OR_NET`);
          } else {
            const gross = new Decimal(c.gross_amount);
            const fee = new Decimal(c.fee_amount);
            const net = new Decimal(c.net_amount);
            const roundingDelta = gross.minus(fee.plus(net)).abs();

            // PayPal fractional rounding rule: $|gross - (fee + net)| <= 0.01$
            if (roundingDelta.greaterThan(new Decimal('0.01'))) {
              inconsistentCaptures++;
              discrepancies.push(`CAPTURE_${c.id}_ROUNDING_MISMATCH_DELTA_${roundingDelta.toFixed(4)}`);
            } else {
              verifiedNet = verifiedNet.plus(net);
              verifiedFees = verifiedFees.plus(fee);
            }
          }
        } else if (c.fee_status === CaptureFeeStatus.PENDING_CONFIRMATION) {
          unverifiedCaptures++;
        } else if (c.fee_status === CaptureFeeStatus.MANUAL_REVIEW_REQUIRED) {
          manualReviewCaptures++;
        }
        break;
      }
      case 'PENDING': {
        // In-flight bank clearing; blocks payout
        pendingCaptures++;
        break;
      }
      case 'DENIED':
      case 'FAILED': {
        anomalousCaptures++;
        discrepancies.push(`CAPTURE_${c.id}_STATUS_${c.status}`);
        break;
      }
      case 'UNKNOWN':
      default: {
        unknownCaptures++;
        discrepancies.push(`CAPTURE_${c.id}_UNKNOWN_STATUS_${c.status}`);
        break;
      }
    }
  }

  // Deterministic Derivations: Hardened Refund Audit
  // CRITICAL: Only COMPLETED refunds count as confirmed provider reversals
  let grossRefunds = new Decimal(0);
  let netRefundDeductions = new Decimal(0);
  let feeReversalsTotal = new Decimal(0);
  let pendingRefunds = 0;
  let pendingFeeReversals = 0;
  let excessiveFeeReversals = 0;

  const completedRefundsGrossByCapture = new Map<string, Decimal>();
  const pendingRefundsGrossByCapture = new Map<string, Decimal>();
  const feeReversalsByCapture = new Map<string, Decimal>();

  for (const r of refunds) {
    if (r.currency !== payment.snapshotCurrency) {
      discrepancies.push(`REFUND_${r.id}_CURRENCY_MISMATCH`);
    }

    const capture = captures.find((c) => c.id === r.capture_id);
    if (!capture) {
      discrepancies.push(`REFUND_${r.id}_MISSING_CAPTURE_${r.capture_id}`);
      continue;
    }

    if (r.status === RefundStatus.COMPLETED) {
      grossRefunds = grossRefunds.plus(new Decimal(r.gross_amount));
      const deduction = r.net_deducted_amount !== null ? new Decimal(r.net_deducted_amount) : new Decimal(r.gross_amount);
      netRefundDeductions = netRefundDeductions.plus(deduction);

      // Track confirmed gross refunds per capture
      const prevGross = completedRefundsGrossByCapture.get(r.capture_id) || new Decimal(0);
      completedRefundsGrossByCapture.set(r.capture_id, prevGross.plus(new Decimal(r.gross_amount)));

      if (r.fee_reversal_status === RefundFeeReversalStatus.VERIFIED && r.fee_reversal_amount !== null) {
        const rev = new Decimal(r.fee_reversal_amount);
        feeReversalsTotal = feeReversalsTotal.plus(rev);
        const prevRev = feeReversalsByCapture.get(r.capture_id) || new Decimal(0);
        feeReversalsByCapture.set(r.capture_id, prevRev.plus(rev));
      } else if (r.fee_reversal_status === RefundFeeReversalStatus.PENDING_CONFIRMATION) {
        pendingFeeReversals++;
      }
    } else if (r.status === RefundStatus.PENDING) {
      pendingRefunds++;
      const prevPending = pendingRefundsGrossByCapture.get(r.capture_id) || new Decimal(0);
      pendingRefundsGrossByCapture.set(r.capture_id, prevPending.plus(new Decimal(r.gross_amount)));

      if (r.fee_reversal_amount !== null) {
        const rev = new Decimal(r.fee_reversal_amount);
        const prevRev = feeReversalsByCapture.get(r.capture_id) || new Decimal(0);
        feeReversalsByCapture.set(r.capture_id, prevRev.plus(rev));
      }
    }
    // FAILED and CANCELLED refunds are strictly ignored
  }

  // Enforce Cumulative Fee-Reversal Cap per Capture
  for (const [captureId, totalReversals] of feeReversalsByCapture.entries()) {
    const capture = captures.find((c) => c.id === captureId);
    if (capture && capture.fee_amount !== null) {
      const maxFee = new Decimal(capture.fee_amount);
      if (totalReversals.greaterThan(maxFee)) {
        excessiveFeeReversals++;
        discrepancies.push(`CAPTURE_${captureId}_FEE_REVERSALS_EXCEED_FEE_${totalReversals.toFixed(2)}_VS_${maxFee.toFixed(2)}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Authoritative Provider Reversal Reconciliation & Single-Deduction Hand-Off
  // -------------------------------------------------------------------------
  let unrecordedReversalsGrossTotal = new Decimal(0);
  let unrecordedReversalsNetDeduction = new Decimal(0);
  let hasUnreconciledProviderReversal = false;

  for (const c of captures) {
    const confirmedRefundGross = completedRefundsGrossByCapture.get(c.id) || new Decimal(0);
    const captureGross = new Decimal(c.gross_amount);

    // Extract authoritative provider-confirmed reversal amount from capture rawResponse
    // In PayPal REST responses, this is returned under refunded_amount.value or amount_refunded
    const rawObj = typeof c.raw_response === 'string' ? JSON.parse(c.raw_response) : c.raw_response;
    const rawRefundedValue = rawObj?.refunded_amount?.value ?? rawObj?.amount_refunded ?? null;
    const providerRefundedGross = rawRefundedValue !== null ? new Decimal(rawRefundedValue) : null;

    if (c.status === 'REFUNDED') {
      const targetReversalGross = providerRefundedGross || captureGross;
      if (confirmedRefundGross.lessThan(targetReversalGross)) {
        // Delta between provider-confirmed reversal and locally completed refunds
        const unrecordedDifference = targetReversalGross.minus(confirmedRefundGross);
        unrecordedReversalsGrossTotal = unrecordedReversalsGrossTotal.plus(unrecordedDifference);
        
        // Conservative treatment under fee-reversal uncertainty: provisional cash deduction
        // assumes zero fee reversal until PayPal confirms otherwise
        unrecordedReversalsNetDeduction = unrecordedReversalsNetDeduction.plus(unrecordedDifference);

        inconsistentCaptures++;
        hasUnreconciledProviderReversal = true;
        discrepancies.push(`CAPTURE_${c.id}_UNRECORDED_PROVIDER_FULL_REVERSAL_DELTA_${unrecordedDifference.toFixed(2)}`);
        pauseReasons.push(`UNRECORDED_CAPTURE_REVERSAL_${c.id}`);
      } else if (confirmedRefundGross.greaterThan(targetReversalGross)) {
        inconsistentCaptures++;
        discrepancies.push(`CAPTURE_${c.id}_EXCESSIVE_LOCAL_REFUNDS_EXCEEDS_CAPTURE_GROSS`);
        pauseReasons.push(`EXCESSIVE_LOCAL_REFUNDS_${c.id}`);
      }
    } else if (c.status === 'PARTIALLY_REFUNDED') {
      if (providerRefundedGross !== null) {
        // Provider reported exact partial reversal amount: compare against completed local refunds
        if (confirmedRefundGross.lessThan(providerRefundedGross)) {
          const unrecordedDifference = providerRefundedGross.minus(confirmedRefundGross);
          unrecordedReversalsGrossTotal = unrecordedReversalsGrossTotal.plus(unrecordedDifference);
          unrecordedReversalsNetDeduction = unrecordedReversalsNetDeduction.plus(unrecordedDifference);

          inconsistentCaptures++;
          hasUnreconciledProviderReversal = true;
          discrepancies.push(`CAPTURE_${c.id}_PARTIAL_REVERSAL_AMOUNT_MISMATCH_RECORDED_${confirmedRefundGross.toFixed(2)}_VS_PROVIDER_${providerRefundedGross.toFixed(2)}`);
          pauseReasons.push(`UNRECONCILED_PARTIAL_REVERSAL_${c.id}`);
        } else if (confirmedRefundGross.greaterThan(providerRefundedGross)) {
          inconsistentCaptures++;
          discrepancies.push(`CAPTURE_${c.id}_EXCESSIVE_LOCAL_REFUNDS_${confirmedRefundGross.toFixed(2)}_EXCEEDS_PROVIDER_${providerRefundedGross.toFixed(2)}`);
          pauseReasons.push(`EXCESSIVE_LOCAL_REFUNDS_${c.id}`);
        }
      } else {
        // Provider rawResponse missing structured partial breakdown
        if (confirmedRefundGross.isZero()) {
          inconsistentCaptures++;
          hasUnreconciledProviderReversal = true;
          discrepancies.push(`CAPTURE_${c.id}_PARTIAL_REVERSAL_WITHOUT_COMPLETED_REFUND_RECORD`);
          pauseReasons.push(`MISSING_REFUND_RECORD_${c.id}`);
        } else {
          // Refund records exist but provider breakdown is absent: require manual review
          manualReviewCaptures++;
          discrepancies.push(`CAPTURE_${c.id}_PARTIAL_REVERSAL_MISSING_PROVIDER_BREAKDOWN`);
          pauseReasons.push(`UNVERIFIED_PARTIAL_REVERSAL_${c.id}`);
        }
      }
    }
  }

  // Deterministic Derivations: Payout Reservations vs Confirmed Disbursements
  let activeReservations = new Decimal(0);
  let confirmedDisbursements = new Decimal(0);

  for (const p of payouts) {
    if (p.currency !== payment.snapshotCurrency) {
      discrepancies.push(`PAYOUT_${p.id}_CURRENCY_MISMATCH`);
    }

    if (p.status === PayoutRecordStatus.INITIATED || p.status === PayoutRecordStatus.PROCESSING) {
      activeReservations = activeReservations.plus(new Decimal(p.amount));
    } else if (p.status === PayoutRecordStatus.DISBURSED) {
      confirmedDisbursements = confirmedDisbursements.plus(new Decimal(p.amount));
    }
  }

  const netFeeTotal = Decimal.max(0, verifiedFees.minus(feeReversalsTotal));

  // Evaluate Actual Net Platform Cash & Deficit
  // netPlatformCash = verifiedNet - netRefundDeductions - unrecordedReversalsNetDeduction - confirmedDisbursements
  const netPlatformCash = verifiedNet
    .minus(netRefundDeductions)
    .minus(unrecordedReversalsNetDeduction)
    .minus(confirmedDisbursements);

  const ledgerDeficit = netPlatformCash.isNegative();
  const deficitAmount = ledgerDeficit ? netPlatformCash.abs() : new Decimal(0);

  // Compile Structured Pause Reasons
  if (unverifiedCaptures > 0) pauseReasons.push(`UNVERIFIED_CAPTURES_${unverifiedCaptures}`);
  if (manualReviewCaptures > 0) pauseReasons.push(`MANUAL_REVIEW_CAPTURES_${manualReviewCaptures}`);
  if (pendingCaptures > 0) pauseReasons.push(`PENDING_CAPTURES_${pendingCaptures}`);
  if (inconsistentCaptures > 0) pauseReasons.push(`INCONSISTENT_CAPTURES_${inconsistentCaptures}`);
  if (anomalousCaptures > 0) pauseReasons.push(`ANOMALOUS_CAPTURES_${anomalousCaptures}`);
  if (unknownCaptures > 0) pauseReasons.push(`UNKNOWN_CAPTURES_${unknownCaptures}`);
  if (pendingRefunds > 0) pauseReasons.push(`PENDING_REFUNDS_${pendingRefunds}`);
  if (pendingFeeReversals > 0) pauseReasons.push(`PENDING_FEE_REVERSALS_${pendingFeeReversals}`);
  if (excessiveFeeReversals > 0) pauseReasons.push(`EXCESSIVE_FEE_REVERSALS_${excessiveFeeReversals}`);
  if (ledgerDeficit) pauseReasons.push(`LEDGER_DEFICIT_${deficitAmount.toFixed(2)}`);

  const shouldPause = pauseReasons.length > 0 || discrepancies.length > 0;

  // -------------------------------------------------------------------------
  // Authoritative Aggregate Lifecycle State Synchronization & Safety Rules
  // -------------------------------------------------------------------------
  const snapshotAmount = new Decimal(payment.snapshotAmount);
  let nextPaymentStatus = payment.status;
  let nextPaidAt = payment.paidAt;
  let updateMilestonePaid = false;

  // Effective net settled gross currently retained by platform from client
  const effectiveSettledGross = grossCaptured.minus(unrecordedReversalsGrossTotal).minus(grossRefunds);

  // High-Precedence Rules: Deficit, Unreconciled Provider Reversals & Terminal States
  if (ledgerDeficit) {
    nextPaymentStatus = PaymentStatus.MANUAL_RECONCILIATION_REQUIRED;
  } else if (hasUnreconciledProviderReversal || discrepancies.length > 0) {
    // CRITICAL: When provider reversals are unrecorded or local records fail to reconcile with provider truth,
    // the payment must be placed into an explicit reconciliation state. It must NEVER be marked PAID or clean PARTIALLY_REFUNDED.
    nextPaymentStatus = PaymentStatus.MANUAL_RECONCILIATION_REQUIRED;
  } else if (payment.status === PaymentStatus.MANUAL_RECONCILIATION_REQUIRED) {
    // Non-overwritable invariant: Existing manual reconciliation cannot be downgraded by automated sync
    nextPaymentStatus = PaymentStatus.MANUAL_RECONCILIATION_REQUIRED;
  } else if (payment.status === PaymentStatus.CANCELLED || payment.status === PaymentStatus.FAILED) {
    // Terminal failure states remain immutable
    nextPaymentStatus = payment.status;
  } else {
    // Standard lifecycle transitions based on fully reconciled aggregates:
    const isFullyRefunded = grossRefunds.greaterThanOrEqualTo(snapshotAmount) ||
      (grossCaptured.greaterThan(0) && grossRefunds.greaterThanOrEqualTo(grossCaptured));
    const isPartiallyRefunded = grossRefunds.greaterThan(0) && grossRefunds.lessThan(grossCaptured);
    const isFullySettled = grossCaptured.greaterThanOrEqualTo(snapshotAmount) && effectiveSettledGross.greaterThanOrEqualTo(snapshotAmount);
    const isPartiallyPaid = grossCaptured.greaterThan(0) && grossCaptured.lessThan(snapshotAmount);

    if (isFullyRefunded) {
      nextPaymentStatus = payment.status === PaymentStatus.MARKED_AS_REFUNDED
        ? PaymentStatus.MARKED_AS_REFUNDED
        : PaymentStatus.REFUNDED;
    } else if (isPartiallyRefunded) {
      nextPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
    } else if (isFullySettled) {
      // Contractual delivery satisfied and funds fully settled without unrecorded reversals
      nextPaymentStatus = PaymentStatus.PAID;
      if (!nextPaidAt) {
        nextPaidAt = new Date();
      }
      updateMilestonePaid = true;
    } else if (isPartiallyPaid) {
      nextPaymentStatus = PaymentStatus.PARTIALLY_PAID;
    }
  }

  // Milestone Status Synchronization
  if (updateMilestonePaid) {
    await tx.milestone.update({
      where: { id: payment.milestoneId },
      data: {
        status: MilestoneStatus.PAID,
        paidAt: nextPaidAt,
      },
    });
  }

  // Payout Status Synchronization & Administrative Hold Protection
  const hasAdminHold = payment.reconciliationNotes?.includes('ADMIN_HOLD') ||
    payment.reconciliationNotes?.includes('SECURITY_HOLD');

  let nextPayoutStatus: PaymentPayoutStatus;
  if (ledgerDeficit || shouldPause) {
    nextPayoutStatus = PaymentPayoutStatus.DISBURSEMENT_PAUSED;
  } else if (hasAdminHold) {
    // Preserve independent administrative or security hold even if financial pause reasons are cleared
    nextPayoutStatus = PaymentPayoutStatus.DISBURSEMENT_PAUSED;
  } else {
    // Payout pause resolved: derive authoritative disbursement state
    if (confirmedDisbursements.greaterThanOrEqualTo(verifiedNet.minus(netRefundDeductions)) && confirmedDisbursements.greaterThan(0)) {
      nextPayoutStatus = PaymentPayoutStatus.DISBURSED;
    } else if (confirmedDisbursements.greaterThan(0)) {
      nextPayoutStatus = PaymentPayoutStatus.PARTIALLY_DISBURSED;
    } else if (activeReservations.greaterThan(0)) {
      nextPayoutStatus = PaymentPayoutStatus.DISBURSEMENT_IN_PROGRESS;
    } else if (grossCaptured.greaterThanOrEqualTo(snapshotAmount) && effectiveSettledGross.greaterThanOrEqualTo(snapshotAmount)) {
      nextPayoutStatus = PaymentPayoutStatus.PLATFORM_HELD;
    } else {
      nextPayoutStatus = PaymentPayoutStatus.AWAITING_PAYMENT;
    }
  }

  // Atomically persist derived aggregates and lifecycle statuses
  await tx.payment.update({
    where: { id: paymentId },
    data: {
      settledAmount: grossCaptured,
      netReceivedAmount: verifiedNet,
      feeAmount: netFeeTotal,
      refundedAmount: grossRefunds,
      netRefundDeducted: netRefundDeductions,
      status: nextPaymentStatus,
      paidAt: nextPaidAt,
      payoutStatus: nextPayoutStatus,
    },
  });

  // Headroom: Available only when gross invoice is fully settled, no pause exists, and no admin hold exists
  const availableHeadroom = (!shouldPause && !hasAdminHold && grossCaptured.greaterThanOrEqualTo(snapshotAmount) && effectiveSettledGross.greaterThanOrEqualTo(snapshotAmount))
    ? Decimal.max(0, netPlatformCash.minus(activeReservations))
    : new Decimal(0);

  return {
    paymentId,
    repaired: true,
    paused: shouldPause,
    pauseReasons,
    discrepancies,
    grossCapturedTotal: grossCaptured,
    verifiedNetReceivedTotal: verifiedNet,
    feeTotal: netFeeTotal,
    grossRefundTotal: grossRefunds,
    netRefundDeductedTotal: netRefundDeductions,
    unrecordedReversalsGrossTotal,
    unrecordedReversalsNetDeduction,
    activePayoutReservationsTotal: activeReservations,
    confirmedDisbursementsTotal: confirmedDisbursements,
    unverifiedCapturesCount: unverifiedCaptures,
    manualReviewCapturesCount: manualReviewCaptures,
    pendingCapturesCount: pendingCaptures,
    inconsistentCapturesCount: inconsistentCaptures,
    anomalousCapturesCount: anomalousCaptures,
    unknownCapturesCount: unknownCaptures,
    pendingRefundsCount: pendingRefunds,
    pendingFeeReversalsCount: pendingFeeReversals,
    excessiveFeeReversalsCount: excessiveFeeReversals,
    hasUnreconciledProviderReversal,
    ledgerDeficit,
    deficitAmount,
    availablePayoutHeadroom: availableHeadroom,
  };
}
```

---

### 5.9 Transactional Service Logic & Payout/Refund Collision Preemption

To eliminate race conditions between incoming client refunds, administrative manual transfers, and automated PayPal payouts, DevFlow defines explicit transactional service contracts operating under the strict Tier 1-4 hierarchical lock sequence.

#### Executable Collision Architecture
When a refund arrives while payouts are already recorded in the database, the system branches deterministically based on whether each payout has been claimed and transmitted to external provider rails:

1. **Refund Colliding with `INITIATED` Payouts (Preemption):**
   - An `INITIATED` payout is an unsubmitted database reservation.
   - If the incoming refund reduces payment-wide net cash below the reserved payout amount, the platform prioritizes client restitution over creator disbursement.
   - DevFlow transactionally **cancels as many `INITIATED` payouts as necessary** (iterating newest to oldest) until sufficient headroom is freed:
     - Sets `PayoutRecord.status = CANCELLED`.
     - Records `failureReason = 'SUPERSEDED_BY_REFUND'`.
     - Appends an audit event to `reconciliationHistory`.
     - Creates an immutable `ActivityLog` entry with `action = 'PAYOUT_CANCELLED_BY_REFUND'`, recording the actor ID, cancelled payout amount, and refund gross.
     - Releases each payout reservation, accumulating freed headroom until the refund deficit is completely covered.

2. **Refund Colliding with `PROCESSING` Payouts (Deferral / Rejection):**
   - A `PROCESSING` payout has already been claimed by a dispatcher and dispatched to the PayPal Payouts batch API (or external bank wire).
   - Funds are actively clearing provider banking rails and **cannot be recalled, aborted, or cancelled**.
   - If processing the refund would cause platform cash to drop below zero assuming in-flight payouts succeed:
     - DevFlow **strictly rejects or defers the refund request** with HTTP `409 Conflict` (`code: 'PAYOUT_IN_FLIGHT'`, `message: 'Disbursement of $X is currently processing with provider rails. Refund cannot be executed until payout settles or fails.'`).
     - **Core Rationale:** 
       1. Cancelling a `PROCESSING` payout record prematurely induces severe phantom accounting if provider rails subsequently deposit the funds.
       2. Treating a `PROCESSING` payout as confirmed cash disbursement violates the fundamental invariant (never mark disbursed without cryptographic provider confirmation).
       3. Rejecting/deferring the refund until provider confirmation arrives guarantees platform solvency and completely eliminates overdraft vulnerabilities.
       4. **In-flight `PROCESSING` payouts are never cancelled.**

#### Transactional Service Implementation Specification
```typescript
// backend/src/modules/payments/refund.service.ts
import { PrismaClient, RefundStatus, PayoutRecordStatus, CaptureFeeStatus, ActivityAction } from '@prisma/client';
import Decimal from 'decimal.js';
import { syncPaymentAggregates } from './reconciliation.service';

export async function processRefund(
  prisma: PrismaClient,
  params: {
    paymentId: string;
    captureId: string;
    grossAmount: Decimal;
    idempotencyKey: string; // Mandatory client-supplied key from Idempotency-Key header
    reason?: string;
    actorUserId: string;
    projectId: string;
  }
): Promise<{ refundId: string; status: RefundStatus; isRetry: boolean; preemptedPayoutIds: string[] }> {
  const { paymentId, captureId, grossAmount, idempotencyKey, reason, actorUserId, projectId } = params;

  // -------------------------------------------------------------------------
  // Phase 1: Tier 1-4 Database Lock & Collision Handling (Atomic DB Transaction)
  // -------------------------------------------------------------------------
  const { newRefund, isRetry, preemptedPayouts } = await prisma.$transaction(async (tx) => {
    // Step 0: Client-Enforced Idempotency & Consistent Replay Check
    const existingRefundWithKey = await tx.paymentRefund.findUnique({
      where: { idempotencyKey },
    });

    if (existingRefundWithKey) {
      // Validate request-payload consistency against existing record
      const isMatchingPayload =
        existingRefundWithKey.paymentId === paymentId &&
        existingRefundWithKey.captureId === captureId &&
        new Decimal(existingRefundWithKey.grossAmount).equals(grossAmount);

      if (!isMatchingPayload) {
        const err: any = new Error(
          `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH: Idempotency key '${idempotencyKey}' was already used for a different refund payload.`
        );
        err.statusCode = 409;
        err.code = 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH';
        throw err;
      }

      // Consistent idempotent replay: return existing record without re-allocating balance or cancelling payouts
      return { newRefund: existingRefundWithKey, isRetry: true, preemptedPayouts: [] };
    }

    // Tier 1: Lock Payment
    const [payment] = await tx.$queryRaw<any[]>`
      SELECT id, "milestoneId", "snapshotAmount", "paidAt", status, "payoutStatus", "snapshotCurrency", "reconciliationNotes"
      FROM payments WHERE id = ${paymentId} FOR UPDATE
    `;
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    // Tier 2: Lock Target Capture
    const [capture] = await tx.$queryRaw<any[]>`
      SELECT * FROM payment_captures WHERE id = ${captureId} AND payment_id = ${paymentId} FOR UPDATE
    `;
    if (!capture) throw new Error(`Capture ${captureId} not found for payment ${paymentId}`);

    // Tier 3: Lock All Existing Refunds for Payment
    const existingRefunds = await tx.$queryRaw<any[]>`
      SELECT * FROM payment_refunds WHERE payment_id = ${paymentId} ORDER BY id ASC FOR UPDATE
    `;

    // Tier 4: Lock All Existing Payouts for Payment
    const existingPayouts = await tx.$queryRaw<any[]>`
      SELECT * FROM payout_records WHERE payment_id = ${paymentId} ORDER BY id ASC FOR UPDATE
    `;

    // Step A: Enforce Target Capture Gross Balance Limit
    const captureGross = new Decimal(capture.gross_amount);
    const existingCommittedGrossOnCapture = existingRefunds
      .filter((r) => r.capture_id === captureId && (r.status === RefundStatus.COMPLETED || r.status === RefundStatus.PENDING))
      .reduce((sum, r) => sum.plus(new Decimal(r.gross_amount)), new Decimal(0));

    if (existingCommittedGrossOnCapture.plus(grossAmount).greaterThan(captureGross)) {
      throw new Error(`REFUND_EXCEEDS_BALANCE: Remaining balance on capture is ${captureGross.minus(existingCommittedGrossOnCapture).toFixed(2)}`);
    }

    // Step B: Derive Authoritative Payment-Wide Net Cash via Full Aggregate Engine
    // (Considers all sibling captures, completed refunds, unrecorded provider reversal deltas, and disbursements)
    const syncPre = await syncPaymentAggregates(tx, paymentId);
    const currentNetPlatformCash = syncPre.verifiedNetReceivedTotal
      .minus(syncPre.netRefundDeductedTotal)
      .minus(syncPre.unrecordedReversalsNetDeduction)
      .minus(syncPre.confirmedDisbursementsTotal);

    const processingPayouts = existingPayouts.filter((p) => p.status === PayoutRecordStatus.PROCESSING);
    const initiatedPayouts = existingPayouts
      .filter((p) => p.status === PayoutRecordStatus.INITIATED)
      .sort((a, b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime()); // Newest first

    const processingAmount = processingPayouts.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));
    const initiatedAmount = initiatedPayouts.reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));

    // Collision Check 1: In-Flight PROCESSING Payouts (Irreversible Rails)
    // If net cash minus in-flight processing payouts minus requested refund < 0, refund must be rejected/deferred
    const projectedCashAfterProcessing = currentNetPlatformCash.minus(processingAmount).minus(grossAmount);
    if (projectedCashAfterProcessing.isNegative()) {
      const err: any = new Error(
        `PAYOUT_IN_FLIGHT: Disbursement of ${processingAmount.toFixed(2)} is currently processing with provider rails. ` +
        `Refund cannot be processed until payout completes or fails, preventing phantom deficit.`
      );
      err.statusCode = 409;
      err.code = 'PAYOUT_IN_FLIGHT';
      throw err;
    }

    // Collision Check 2: Unsubmitted INITIATED Payouts (Preempt as Many as Necessary)
    const preemptedPayoutsList: any[] = [];
    let freedHeadroom = new Decimal(0);
    const projectedCashAfterInitiated = projectedCashAfterProcessing.minus(initiatedAmount);

    if (projectedCashAfterInitiated.isNegative()) {
      const deficitToCover = projectedCashAfterInitiated.abs();

      for (const p of initiatedPayouts) {
        // Preempt and cancel the unsubmitted initiated payout
        await tx.payoutRecord.update({
          where: { id: p.id },
          data: {
            status: PayoutRecordStatus.CANCELLED,
            cancelledAt: new Date(),
            failureReason: 'SUPERSEDED_BY_REFUND',
            reconciliationHistory: [
              ...(Array.isArray(p.reconciliation_history) ? p.reconciliation_history : []),
              {
                timestamp: new Date().toISOString(),
                action: 'CANCELLED_BY_REFUND',
                refundGross: grossAmount.toString(),
                actorUserId,
              },
            ],
          },
        });

        // Record immutable ActivityLog entry
        await tx.activityLog.create({
          data: {
            projectId,
            userId: actorUserId,
            action: ActivityAction.PAYOUT_CANCELLED_BY_REFUND,
            entityType: 'PAYOUT_RECORD',
            entityId: p.id,
            details: {
              reason: 'SUPERSEDED_BY_REFUND',
              payoutAmount: p.amount.toString(),
              refundGrossAmount: grossAmount.toString(),
              cancelledAt: new Date().toISOString(),
            },
          },
        });

        preemptedPayoutsList.push(p);
        freedHeadroom = freedHeadroom.plus(new Decimal(p.amount));

        // Stop cancelling once sufficient headroom is freed to cover the refund deficit
        if (freedHeadroom.greaterThanOrEqualTo(deficitToCover)) {
          break;
        }
      }
    }

    // Step C: Insert Pending Refund Reservation using client-supplied idempotencyKey
    const refund = await tx.paymentRefund.create({
      data: {
        paymentId,
        captureId,
        idempotencyKey,
        status: RefundStatus.PENDING,
        grossAmount,
        currency: payment.snapshotCurrency,
        reason,
        requestedAt: new Date(),
      },
    });

    // Step D: Re-derive aggregates within transaction
    await syncPaymentAggregates(tx, paymentId);

    return { newRefund: refund, isRetry: false, preemptedPayouts: preemptedPayoutsList };
  });

  // If this was an idempotent replay, return immediately without duplicate HTTP dispatch
  if (isRetry) {
    return {
      refundId: newRefund.id,
      status: newRefund.status,
      isRetry: true,
      preemptedPayoutIds: [],
    };
  }

  // -------------------------------------------------------------------------
  // Phase 2: External HTTP API Call to PayPal REST API (Outside DB Transaction)
  // -------------------------------------------------------------------------
  // Row locks released. Two-phase worker dispatches HTTP POST /v2/payments/captures/:id/refund
  // Passing PayPal-Request-Id: idempotencyKey (exact client key)
  // Both initial dispatch, retries, and worker recovery reuse this exact key.
  return {
    refundId: newRefund.id,
    status: newRefund.status,
    isRetry: false,
    preemptedPayoutIds: preemptedPayouts.map((p) => p.id),
  };
}

export async function claimPayoutForDispatch(
  prisma: PrismaClient,
  params: {
    payoutId: string;
    workerId: string;
    projectId: string;
  }
): Promise<{ claimed: boolean; payout: any }> {
  const { payoutId, workerId, projectId } = params;

  return await prisma.$transaction(async (tx) => {
    // Acquire Tier 4 lock on target payout record
    const [payout] = await tx.$queryRaw<any[]>`
      SELECT * FROM payout_records WHERE id = ${payoutId} FOR UPDATE
    `;
    if (!payout) throw new Error(`Payout ${payoutId} not found`);

    // Anti-Race Invariant: Payout can only be claimed if strictly in INITIATED status
    if (payout.status !== PayoutRecordStatus.INITIATED) {
      throw new Error(`PAYOUT_NOT_DISPATCHABLE: Payout ${payoutId} is in status '${payout.status}', cannot claim for dispatch.`);
    }

    // Atomically transition status to PROCESSING before external HTTP call
    const updated = await tx.payoutRecord.update({
      where: { id: payoutId },
      data: {
        status: PayoutRecordStatus.PROCESSING,
        rawResponse: {
          dispatchClaimedAt: new Date().toISOString(),
          workerId,
        },
      },
    });

    // Record immutable ActivityLog entry
    await tx.activityLog.create({
      data: {
        projectId,
        userId: payout.admin_user_id,
        action: ActivityAction.PAYOUT_CLAIMED_FOR_DISPATCH,
        entityType: 'PAYOUT_RECORD',
        entityId: payout.id,
        details: {
          workerId,
          claimedAt: new Date().toISOString(),
          payoutAmount: payout.amount.toString(),
        },
      },
    });

    return { claimed: true, payout: updated };
  });
}
```

---

### 5.10 Safe External Provider Operation Sequencing (Two-Phase / Outbox Pattern)

Under no circumstances may backend services hold open PostgreSQL database transactions or row locks while awaiting external HTTP network calls to PayPal API. Network latency, socket drops, and provider timeouts would exhaust database connection pools and induce cascading application hangs. Furthermore, HTTP side effects cannot be rolled back by PostgreSQL transactions.

DevFlow enforces a strict two-phase operation pattern for all external PayPal mutating operations (Refunds and Payouts):

```mermaid
sequenceDiagram
    autonumber
    participant Client as API Client / Admin
    participant Svc as DevFlow Payment Service
    participant DB as PostgreSQL Database
    participant PayPal as PayPal REST API

    Note over Svc,DB: Phase 1: Database Reservation (Atomic Transaction)
    Svc->>DB: BEGIN TRANSACTION (FOR UPDATE on Payment & Capture)
    Svc->>DB: Validate balance, gross limits, and fee headroom
    Svc->>DB: INSERT INTO payment_refunds (status = 'PENDING', idempotency_key = :uuid, requested_at = NOW())
    Svc->>DB: syncPaymentAggregates() [Reserves headroom]
    Svc->>DB: COMMIT TRANSACTION (Row locks released immediately)

    Note over Svc,PayPal: Phase 2: External HTTP API Call (Outside DB Transaction)
    Svc->>PayPal: POST /v2/payments/captures/:id/refund<br/>Headers: PayPal-Request-Id: :uuid
    
    alt HTTP 201 Created (Success)
        Note over Svc,DB: Phase 3: Response Ingestion (Atomic Transaction)
        Svc->>DB: BEGIN TRANSACTION (FOR UPDATE)
        Svc->>DB: UPDATE payment_refunds SET status = 'COMPLETED', paypal_refund_id = :id, refunded_at = :providerTime
        Svc->>DB: syncPaymentAggregates() [Confirms deduction]
        Svc->>DB: COMMIT TRANSACTION
        Svc-->>Client: 200 OK (Refund Confirmed)
    else HTTP 4xx (Non-retryable Error)
        Svc->>DB: BEGIN TRANSACTION (FOR UPDATE)
        Svc->>DB: UPDATE payment_refunds SET status = 'FAILED', failure_reason = :error
        Svc->>DB: syncPaymentAggregates() [Releases reservation]
        Svc->>DB: COMMIT TRANSACTION
        Svc-->>Client: 400 Bad Request
    else Timeout / Network Socket Drop (Ambiguous)
        Note over Svc,PayPal: Phase 4: Safe Timeout Recovery
        Svc-->>Client: 202 Accepted (Refund Processing - Reservation Retained)
        Note over Svc: Background worker queries PayPal API by idempotency key
        Svc->>PayPal: GET /v2/payments/captures/:id/refunds (or lookup by PayPal-Request-Id)
        alt PayPal confirms refund was executed
            Svc->>DB: Update status = 'COMPLETED', refunded_at = :time, reconcile details
        else PayPal confirms no refund executed
            Svc->>DB: Update status = 'FAILED', release reservation
        end
    end
```


---

## 6. PayPal Invoicing Pipeline, Status Transitions & Webhook Verification

### 6.1 Provider Status Mapping & Reissue Policy

| PayPal Status | Internal `PaymentStatus` | Active or Terminal? | Can Reissue New Version ($V_{n+1}$)? |
|---|---|---|---|
| *(In Flight)* | `CREATING` | Active | ❌ No |
| `DRAFT` | `DRAFT` | Active | ❌ No |
| `SCHEDULED` | `SCHEDULED` | Active | ❌ No |
| *(In Flight)* | `SENDING` | Active | ❌ No |
| `SENT` | `SENT` | Active | ❌ No |
| `PAID` / `MARKED_AS_PAID` | `PAID` | Active (Settled) | ❌ No (Milestone Settled) |
| `PAYMENT_PENDING` | `PAYMENT_PENDING` | Active | ❌ No |
| `PARTIALLY_PAID` | `PARTIALLY_PAID` | Active | ❌ No |
| `PARTIALLY_REFUNDED` | `PARTIALLY_REFUNDED` | Active (Settled with partial refund) | ❌ No |
| `CANCELLED` | `CANCELLED` | **Terminal** | ✅ **Yes** (Remote cancellation confirmed) |
| `REFUNDED` | `REFUNDED` | **Terminal** | ❌ No (Settlement fully refunded) |
| `MARKED_AS_REFUNDED` | `MARKED_AS_REFUNDED` | **Terminal** | ❌ No (Settlement marked refunded externally) |
| *(Local Error)* | `FAILED` | **Terminal** | ✅ **Yes** (Remote invoice never created) |
| *(Ambiguous Timeout)*| `MANUAL_RECONCILIATION_REQUIRED` | Active | ❌ **Strictly Blocked** until reconciled |


---

## 7. Complete Prisma Database Schema (v2.5.11 — 21 Models)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  CLIENT
  FREELANCER
  ADMIN
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
  DISPUTED
}

enum ProjectMemberRole {
  OWNER
  CLIENT
  LEAD_DEVELOPER
  MEMBER
  VIEWER
}

enum ProjectInvitationRole {
  CLIENT
  LEAD_DEVELOPER
  MEMBER
  VIEWER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  REVOKED
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  EVIDENCE_SUBMITTED
  APPROVED
  REJECTED
  PAID
}

enum VerificationStatus {
  UNVERIFIED
  PASSED
  FAILED
  MANUAL_REVIEW_REQUIRED
  AI_UNAVAILABLE
}

enum EvidenceType {
  FILE
  GITHUB_COMMIT
  GITHUB_PR
  TEXT_NOTE
  URL
}

enum PaymentStatus {
  PENDING
  CREATING
  DRAFT
  SCHEDULED
  SENDING
  SENT
  PAID
  PAYMENT_PENDING
  PARTIALLY_PAID
  PARTIALLY_REFUNDED
  CANCELLED
  FAILED
  REFUNDED
  MARKED_AS_REFUNDED
  MANUAL_RECONCILIATION_REQUIRED
}

enum PaymentPayoutStatus {
  AWAITING_PAYMENT
  PLATFORM_HELD
  DISBURSEMENT_IN_PROGRESS
  PARTIALLY_DISBURSED
  DISBURSED
  DISBURSEMENT_PAUSED
  PAYOUT_FAILED
}

enum PayoutProvider {
  PAYPAL_PAYOUTS
  MANUAL_TRANSFER
}

enum PayoutRecordStatus {
  INITIATED
  PROCESSING
  DISBURSED
  FAILED
  CANCELLED
}

enum CaptureStatus {
  COMPLETED
  PENDING
  REFUNDED
  PARTIALLY_REFUNDED
  DENIED
  FAILED
  UNKNOWN
}

enum CaptureFeeStatus {
  VERIFIED
  PENDING_CONFIRMATION
  MANUAL_REVIEW_REQUIRED
}

enum RefundStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
}

enum RefundFeeReversalStatus {
  VERIFIED
  PENDING_CONFIRMATION
  NO_FEE_REVERSAL
}

enum ActivityAction {
  USER_REGISTERED
  PROJECT_CREATED
  PROJECT_UPDATED
  INVITATION_SENT
  INVITATION_ACCEPTED
  MILESTONE_CREATED
  MILESTONE_UPDATED
  EVIDENCE_SUBMITTED
  AI_VERIFICATION_COMPLETED
  MILESTONE_APPROVED
  MILESTONE_REJECTED
  INVOICE_CREATED
  INVOICE_SENT
  PAYMENT_RECEIVED
  PAYMENT_REFUNDED
  PAYOUT_INITIATED
  PAYOUT_CONFIRMED
  PAYOUT_CANCELLED
  PAYOUT_CANCELLED_BY_REFUND
  PAYOUT_CLAIMED_FOR_DISPATCH
  PAYOUT_DISBURSED
  PAYOUT_FAILED
  MANUAL_HOLD_APPLIED
  MANUAL_HOLD_CLEARED
  RECONCILIATION_RESOLVED
}

enum NotificationType {
  INVITATION_RECEIVED
  INVITATION_ACCEPTED
  MILESTONE_SUBMITTED
  VERIFICATION_READY
  MILESTONE_APPROVED
  MILESTONE_REJECTED
  INVOICE_RECEIVED
  PAYMENT_CONFIRMED
  PAYMENT_REFUNDED
  PAYOUT_DISBURSED
  SYSTEM_ALERT
}

model User {
  id                 String       @id @default(uuid())
  email              String       @unique
  passwordHash       String?
  name               String
  avatarUrl          String?
  bio                String?
  role               Role         @default(FREELANCER)
  githubId           String?      @unique
  githubAccessToken  String?      // AES-256-GCM encrypted
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  createdProjects    Project[]    @relation("ProjectCreator")
  clientProjects     Project[]    @relation("ProjectClient")
  developerProjects  Project[]    @relation("ProjectLeadDeveloper")
  memberships        ProjectMember[]
  assignedMilestones Milestone[]  @relation("AssignedDeveloper")
  submittedMilestones Milestone[] @relation("SubmittedBy")
  approvals          MilestoneApproval[]
  evidences          Evidence[]
  sentInvitations    ProjectInvitation[] @relation("InvitationSender")
  createdPayments    Payment[]    @relation("PaymentCreator")
  authorizedPayouts  PayoutRecord[] @relation("AdminAuthorizedPayouts")
  refreshTokens      RefreshToken[]
  passwordResetTokens PasswordResetToken[]
  oauthExchangeCodes OAuthExchangeCode[]
  accountLinkingChallenges AccountLinkingChallenge[]
  notifications      Notification[]
  activityLogs       ActivityLog[]

  @@map("users")
}

model RefreshToken {
  id                 String       @id @default(uuid())
  familyId           String       @db.Uuid
  tokenHash          String       @unique // SHA-256
  userId             String
  replacedByTokenId  String?      @unique
  revokedAt          DateTime?
  expiresAt          DateTime
  createdAt          DateTime     @default(now())

  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  replacedBy         RefreshToken? @relation("TokenRotation", fields: [replacedByTokenId], references: [id])
  replaces           RefreshToken? @relation("TokenRotation")

  @@index([userId])
  @@index([familyId])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id                 String       @id @default(uuid())
  tokenHash          String       @unique // SHA-256
  userId             String
  expiresAt          DateTime
  usedAt             DateTime?
  createdAt          DateTime     @default(now())

  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

model OAuthState {
  id                 String       @id @default(uuid())
  stateHash          String       @unique // SHA-256
  pkceVerifier       String?      // AES-256-GCM encrypted
  expiresAt          DateTime
  usedAt             DateTime?
  createdAt          DateTime     @default(now())

  @@index([stateHash])
  @@map("oauth_states")
}

model OAuthExchangeCode {
  id                 String       @id @default(uuid())
  codeHash           String       @unique // SHA-256
  userId             String
  expiresAt          DateTime
  usedAt             DateTime?
  createdAt          DateTime     @default(now())

  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([codeHash])
  @@index([userId])
  @@map("oauth_exchange_codes")
}

model AccountLinkingChallenge {
  id                     String       @id @default(uuid())
  challengeHash          String       @unique // SHA-256
  userId                 String
  githubId               String
  encryptedGithubToken   String
  otpHash                String?      // SHA-256 of 6-digit OTP for passwordless
  otpAttempts            Int          @default(0)
  maxOtpAttempts         Int          @default(5)
  otpSentAt              DateTime?
  resendCooldownSeconds  Int          @default(60)
  expiresAt              DateTime
  usedAt                 DateTime?
  createdAt              DateTime     @default(now())

  user                   User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([challengeHash])
  @@index([userId])
  @@map("account_linking_challenges")
}

model Project {
  id                 String          @id @default(uuid())
  title              String
  description        String?
  brief              String?
  budget             Decimal?        @db.Decimal(12, 2)
  currency           String          @default("USD") @db.VarChar(3)
  status             ProjectStatus   @default(DRAFT)
  createdById        String
  clientId           String?
  leadDeveloperId    String?
  githubRepoOwner    String?
  githubRepoName     String?
  isArchived         Boolean         @default(false)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  createdBy          User            @relation("ProjectCreator", fields: [createdById], references: [id], onDelete: Restrict)
  client             User?           @relation("ProjectClient", fields: [clientId], references: [id], onDelete: Restrict)
  leadDeveloper      User?           @relation("ProjectLeadDeveloper", fields: [leadDeveloperId], references: [id], onDelete: Restrict)
  members            ProjectMember[]
  invitations        ProjectInvitation[]
  milestones         Milestone[]
  activityLogs       ActivityLog[]

  @@index([createdById])
  @@index([clientId])
  @@index([leadDeveloperId])
  @@map("projects")
}

model ProjectInvitation {
  id                 String                @id @default(uuid())
  projectId          String
  invitedById        String
  email              String
  role               ProjectInvitationRole
  tokenHash          String                @unique // SHA-256
  status             InvitationStatus      @default(PENDING)
  expiresAt          DateTime
  acceptedAt         DateTime?
  createdAt          DateTime              @default(now())

  project            Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  invitedBy          User                  @relation("InvitationSender", fields: [invitedById], references: [id], onDelete: Restrict)

  @@index([email])
  @@index([projectId, email, status])
  @@map("project_invitations")
}

model ProjectMember {
  id                 String            @id @default(uuid())
  projectId          String
  userId             String
  role               ProjectMemberRole
  joinedAt           DateTime          @default(now())

  project            Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user               User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
  @@map("project_members")
}

model Milestone {
  id                   String             @id @default(uuid())
  projectId            String
  assignedDeveloperId  String?
  submittedById        String?
  title                String
  description          String?
  requirements         String[]
  paymentAmount        Decimal            @db.Decimal(12, 2)
  currency             String             @default("USD") @db.VarChar(3)
  status               MilestoneStatus    @default(PENDING)
  verificationStatus   VerificationStatus @default(UNVERIFIED)
  publicToken          String?            @unique
  isPubliclyVisible    Boolean            @default(false)
  orderIndex           Int                @default(0)
  dueDate              DateTime?
  submittedAt          DateTime?
  approvedAt           DateTime?
  paidAt               DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  project              Project            @relation(fields: [projectId], references: [id], onDelete: Restrict)
  assignedDeveloper    User?              @relation("AssignedDeveloper", fields: [assignedDeveloperId], references: [id], onDelete: SetNull)
  submittedBy          User?              @relation("SubmittedBy", fields: [submittedById], references: [id], onDelete: SetNull)
  approvals            MilestoneApproval[]
  evidence             Evidence[]
  verificationResult   VerificationResult?
  payments             Payment[]

  @@index([projectId])
  @@index([assignedDeveloperId])
  @@index([publicToken])
  @@map("milestones")
}

model MilestoneApproval {
  id                   String        @id @default(uuid())
  milestoneId          String
  approvedById         String
  decision             String        // "APPROVED" or "REJECTED"
  feedback             String?
  createdAt            DateTime      @default(now())

  milestone            Milestone     @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  approvedBy           User          @relation(fields: [approvedById], references: [id], onDelete: Restrict)

  @@index([milestoneId])
  @@map("milestone_approvals")
}

model Evidence {
  id                   String        @id @default(uuid())
  milestoneId          String
  uploadedById         String
  type                 EvidenceType
  title                String
  description          String?
  fileKey              String?       // Local disk path or object storage key
  fileName             String?
  fileSize             Int?
  mimeType             String?
  githubCommitSha      String?
  githubPrNumber       Int?
  githubRepoOwner      String?
  githubRepoName       String?
  externalUrl          String?
  textNote             String?
  isDeleted            Boolean       @default(false)
  createdAt            DateTime      @default(now())

  milestone            Milestone     @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  uploadedBy           User          @relation(fields: [uploadedById], references: [id], onDelete: Restrict)

  @@index([milestoneId])
  @@map("evidence")
}

model VerificationResult {
  id                   String             @id @default(uuid())
  milestoneId          String             @unique
  status               VerificationStatus @default(UNVERIFIED)
  overallScore         Int                @default(0) // 0-100
  summary              String?
  checklistResults     Json               @default("[]")
  riskAssessment       Json?
  recommendations      String[]
  modelName            String             @default("gemini-2.0-flash")
  analyzedAt           DateTime           @default(now())

  milestone            Milestone          @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  analyses             AIAnalysis[]

  @@index([milestoneId])
  @@map("verification_results")
}

model AIAnalysis {
  id                   String             @id @default(uuid())
  verificationResultId String
  agentType            String             // "EVIDENCE_VERIFIER", "CODE_AUDITOR", "RISK_ASSESSOR"
  promptTokens         Int?
  completionTokens     Int?
  rawResponse          String?
  createdAt            DateTime           @default(now())

  verificationResult   VerificationResult @relation(fields: [verificationResultId], references: [id], onDelete: Cascade)

  @@index([verificationResultId])
  @@map("ai_analyses")
}

model Payment {
  id                   String              @id @default(uuid())
  milestoneId          String
  createdById          String
  invoiceVersion       Int                 @default(1)
  paypalInvoiceId      String?             @unique
  paypalInvoiceUrl     String?
  status               PaymentStatus       @default(PENDING)
  payoutStatus         PaymentPayoutStatus @default(AWAITING_PAYMENT)
  snapshotAmount       Decimal             @db.Decimal(12, 2)
  settledAmount        Decimal             @default(0) @db.Decimal(12, 2) // Gross fiat captured
  netReceivedAmount    Decimal             @default(0) @db.Decimal(12, 2) // Gross - verified fees
  feeAmount            Decimal             @default(0) @db.Decimal(12, 2) // Verified fees - verified reversals
  refundedAmount       Decimal             @default(0) @db.Decimal(12, 2) // Confirmed gross refunds
  netRefundDeducted    Decimal             @default(0) @db.Decimal(12, 2) // Gross - feeReversals
  snapshotCurrency     String              @default("USD") @db.VarChar(3)
  payerEmail           String
  beneficiaryEmail     String
  paidAt               DateTime?
  errorMessage         String?
  lastReconciledAt     DateTime?
  reconciliationNotes  String?
  idempotencyKey       String              @unique @db.VarChar(128)
  referenceId          String              @unique @db.VarChar(128)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  milestone            Milestone           @relation(fields: [milestoneId], references: [id], onDelete: Restrict)
  createdBy            User                @relation("PaymentCreator", fields: [createdById], references: [id], onDelete: Restrict)
  captures             PaymentCapture[]
  refunds              PaymentRefund[]
  webhookEvents        WebhookEvent[]
  payoutRecords        PayoutRecord[]

  @@unique([milestoneId, invoiceVersion])
  @@index([milestoneId])
  @@index([referenceId])
  @@map("payments")
}

model PaymentCapture {
  id                 String           @id @default(uuid())
  paymentId          String           @map("payment_id")
  paypalCaptureId    String           @unique @db.VarChar(128) @map("paypal_capture_id")
  status             CaptureStatus    @default(PENDING)
  grossAmount        Decimal          @db.Decimal(12, 2) @map("gross_amount")
  feeAmount          Decimal?         @db.Decimal(12, 2) @map("fee_amount")
  netAmount          Decimal?         @db.Decimal(12, 2) @map("net_amount")
  currency           String           @db.VarChar(3)
  feeStatus          CaptureFeeStatus @default(PENDING_CONFIRMATION) @map("fee_status")
  capturedAt         DateTime         @map("captured_at")
  rawResponse        Json             @map("raw_response")
  createdAt          DateTime         @default(now()) @map("created_at")
  updatedAt          DateTime         @updatedAt @map("updated_at")

  payment            Payment          @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  refunds            PaymentRefund[]

  @@unique([paymentId, id], name: "payment_capture_ownership_idx")
  @@index([paymentId])
  @@map("payment_captures")
}

model PaymentRefund {
  id                 String                  @id @default(uuid())
  paymentId          String                  @map("payment_id")
  captureId          String                  @map("capture_id")
  paypalRefundId     String?                 @unique @db.VarChar(128) @map("paypal_refund_id")
  idempotencyKey     String                  @unique @db.VarChar(128) @map("idempotency_key")
  status             RefundStatus            @default(PENDING)
  grossAmount        Decimal                 @db.Decimal(12, 2) @map("gross_amount")
  feeReversalStatus  RefundFeeReversalStatus @default(PENDING_CONFIRMATION) @map("fee_reversal_status")
  feeReversalAmount  Decimal?                @db.Decimal(12, 2) @map("fee_reversal_amount")
  netDeductedAmount  Decimal?                @db.Decimal(12, 2) @map("net_deducted_amount")
  currency           String                  @db.VarChar(3)
  reason             String?
  rawResponse        Json?                   @map("raw_response")
  requestedAt        DateTime                @default(now()) @map("requested_at")
  refundedAt         DateTime?               @map("refunded_at")
  createdAt          DateTime                @default(now()) @map("created_at")
  updatedAt          DateTime                @updatedAt @map("updated_at")

  payment            Payment                 @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  capture            PaymentCapture          @relation(fields: [captureId], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@index([captureId])
  @@map("payment_refunds")
}

model PayoutRecord {
  id                     String             @id @default(uuid())
  paymentId              String             @map("payment_id")
  provider               PayoutProvider     @default(PAYPAL_PAYOUTS)
  providerPayoutBatchId  String?            @db.VarChar(128) @map("provider_payout_batch_id")
  providerItemId         String?            @unique @db.VarChar(128) @map("provider_item_id")
  amount                 Decimal            @db.Decimal(12, 2)
  currency               String             @default("USD") @db.VarChar(3)
  beneficiaryEmail       String             @map("beneficiary_email")
  status                 PayoutRecordStatus @default(INITIATED)
  idempotencyKey         String             @unique @db.VarChar(128) @map("idempotency_key")
  transferReference      String?            @db.VarChar(255) @map("transfer_reference")
  adminUserId            String             @map("admin_user_id")
  evidenceDocumentUrl    String?            @map("evidence_document_url")
  failureReason          String?            @map("failure_reason")
  reconciliationHistory  Json               @default("[]") @map("reconciliation_history")
  rawResponse            Json?              @map("raw_response")
  initiatedAt            DateTime           @default(now()) @map("initiated_at")
  disbursedAt            DateTime?          @map("disbursed_at")
  cancelledAt            DateTime?          @map("cancelled_at")
  createdAt              DateTime           @default(now()) @map("created_at")
  updatedAt              DateTime           @updatedAt @map("updated_at")

  payment                Payment            @relation(fields: [paymentId], references: [id], onDelete: Restrict)
  adminUser              User               @relation("AdminAuthorizedPayouts", fields: [adminUserId], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@index([adminUserId])
  @@map("payout_records")
}

model WebhookEvent {
  id                   String        @id @default(uuid())
  provider             String        @default("PAYPAL")
  eventId              String
  eventType            String
  summary              String?
  resourceId           String?
  payload              Json
  status               String        @default("RECEIVED")
  processedAt          DateTime?
  errorMessage         String?
  createdAt            DateTime      @default(now())

  paymentId            String?
  payment              Payment?      @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  @@unique([provider, eventId])
  @@index([resourceId])
  @@map("webhook_events")
}

model Notification {
  id                   String           @id @default(uuid())
  userId               String
  type                 NotificationType
  title                String
  message              String
  linkUrl              String?
  isRead               Boolean          @default(false)
  createdAt            DateTime         @default(now())

  user                 User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

model ActivityLog {
  id                   String         @id @default(uuid())
  projectId            String
  userId               String?
  action               ActivityAction
  entityType           String
  entityId             String
  details              Json           @default("{}")
  createdAt            DateTime       @default(now())

  project              Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user                 User?          @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([projectId, createdAt(sort: Desc)])
  @@map("activity_logs")
}
```

---

### 7.1 PostgreSQL Migrations Matching Prisma Identifiers

#### Active Milestone Invoice Index
```sql
-- database/prisma/migrations/20261107_active_invoice_constraint/migration.sql
CREATE UNIQUE INDEX active_milestone_invoice_idx 
ON payments ("milestoneId") 
WHERE status IN (
  'CREATING'::"PaymentStatus", 
  'DRAFT'::"PaymentStatus", 
  'SCHEDULED'::"PaymentStatus", 
  'SENDING'::"PaymentStatus", 
  'SENT'::"PaymentStatus", 
  'PAID'::"PaymentStatus", 
  'PAYMENT_PENDING'::"PaymentStatus", 
  'PARTIALLY_PAID'::"PaymentStatus", 
  'PARTIALLY_REFUNDED'::"PaymentStatus", 
  'MANUAL_RECONCILIATION_REQUIRED'::"PaymentStatus"
);
```

#### Unique Pending Project Invitation Index
```sql
-- database/prisma/migrations/20261107_unique_pending_invitation/migration.sql
CREATE UNIQUE INDEX unique_pending_project_invitation_idx 
ON project_invitations ("projectId", LOWER(email), role) 
WHERE status = 'PENDING'::"InvitationStatus";
```

#### Counterparty Separation Database CHECK Constraint
```sql
-- database/prisma/migrations/20261107_counterparty_separation_check/migration.sql
ALTER TABLE projects 
ADD CONSTRAINT check_counterparty_separation 
CHECK ("clientId" IS NULL OR "leadDeveloperId" IS NULL OR "clientId" <> "leadDeveloperId");
```

#### Refund-to-Capture Ownership Composite Constraint
```sql
-- database/prisma/migrations/20261107_refund_capture_ownership_check/migration.sql
-- Enforce composite foreign key constraint on payment_refunds
-- Relies on existing unique constraint "payment_capture_ownership_idx" on payment_captures(payment_id, id) generated by Prisma baseline migration
ALTER TABLE payment_refunds
ADD CONSTRAINT fk_refund_capture_payment_ownership
FOREIGN KEY (payment_id, capture_id)
REFERENCES payment_captures (payment_id, id)
ON DELETE RESTRICT;
```

*Migration Ordering Note: Prisma automatically creates unique index `payment_capture_ownership_idx` from `@@unique([paymentId, id], name: "payment_capture_ownership_idx")` during Phase 1 baseline migration. Migration 2 applies the composite foreign key constraint without creating duplicate unique constraints. Both migrations are verified by static inspection and remain unexecuted pending Phase 1.*

#### Financial Amount Positive Database Constraints
```sql
-- database/prisma/migrations/20261107_financial_amount_positive_checks/migration.sql
ALTER TABLE payments 
ADD CONSTRAINT check_payment_positive_amounts 
CHECK ("snapshotAmount" > 0 AND "settledAmount" >= 0 AND "feeAmount" >= 0 AND "netReceivedAmount" >= 0 AND "refundedAmount" >= 0);

ALTER TABLE payment_captures 
ADD CONSTRAINT check_capture_positive_amounts 
CHECK (gross_amount > 0 AND (fee_amount IS NULL OR fee_amount >= 0) AND (net_amount IS NULL OR net_amount >= 0));

ALTER TABLE payment_refunds 
ADD CONSTRAINT check_refund_positive_amounts 
CHECK (gross_amount > 0 AND (fee_reversal_amount IS NULL OR fee_reversal_amount >= 0) AND (net_deducted_amount IS NULL OR net_deducted_amount >= 0));

ALTER TABLE payout_records 
ADD CONSTRAINT check_payout_positive_amount 
CHECK (amount > 0);
```

---



---



---



---

## 8. AI Agent Safety, Structural Injection Defense & Gemini SDK Structure

### 8.1 Official Google Gen AI SDK Structure (`@google/genai` ^0.1.1)

DevFlow integrates with Google Gemini 2.0 Flash using the official `@google/genai` SDK:

```typescript
// backend/src/modules/ai/providers/gemini.provider.ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function verifyEvidence(sanitizedEvidence: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: sanitizedEvidence,
    config: {
      systemInstruction: "You are an advisory evidence auditor. Output JSON only. You have zero authority to approve milestones or issue payments.",
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          overallScore: { type: "INTEGER" },
          summary: { type: "STRING" },
          checklistResults: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                requirement: { type: "STRING" },
                passed: { type: "BOOLEAN" },
                evidenceExcerpt: { type: "STRING" },
              },
              required: ["requirement", "passed"],
            },
          },
          recommendations: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["overallScore", "summary", "checklistResults", "recommendations"],
      },
      temperature: 0.2,
    },
  });

  return JSON.parse(response.text || '{}');
}
```

---



---

## 9. Phased Environment Validation & Deployment Safety

### 9.1 Unified Environment Validation against Parsed Configuration

```typescript
// backend/src/config/env.ts
import { z } from 'zod';

export const CombinedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  CLIENT_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)").optional(),
  
  // AI Configuration
  AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_MAX_RETRIES: z.coerce.number().default(2),
  
  // PayPal Configuration
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_BASE_URL: z.string().url().default('https://api-m.sandbox.paypal.com'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
}).superRefine((parsed, ctx) => {
  // Reject insecure JWT defaults
  const blacklist = ['secret', 'password', 'change_me', 'super_secret'];
  if (blacklist.some(item => parsed.JWT_SECRET.toLowerCase().includes(item))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "JWT_SECRET contains an insecure default or blacklisted phrase",
      path: ['JWT_SECRET'],
    });
  }

  // Reject mock AI in production
  if (parsed.NODE_ENV === 'production' && parsed.AI_PROVIDER === 'mock') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "AI_PROVIDER cannot be 'mock' in production environments",
      path: ['AI_PROVIDER'],
    });
  }

  // Enforce Gemini API Key when provider is gemini
  if (parsed.AI_PROVIDER === 'gemini' && !parsed.GEMINI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GEMINI_API_KEY is required when AI_PROVIDER is 'gemini'",
      path: ['GEMINI_API_KEY'],
    });
  }
});

export type ValidatedEnv = z.infer<typeof CombinedEnvSchema>;

export const validateEnv = (config: Record<string, unknown>): ValidatedEnv => {
  const result = CombinedEnvSchema.safeParse(config);
  if (!result.success) {
    console.error("Environment Validation Failed:", result.error.format());
    process.exit(1);
  }
  return result.data;
};
```

---



---

## 10. Frontend API Contract & Canonical Specifications

### 10.1 Standard Error Envelope

```typescript
export interface ApiErrorResponse {
  error: {
    code: string;       // e.g. "VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN", "CONFLICT", "GONE"
    message: string;    // Human-readable message
    details?: unknown;  // Zod issue array or validation metadata
    timestamp: string;  // ISO 8601
  };
}
```

### 10.2 Complete Module Contracts (All 16 Modules)

#### 1. Authentication (`/api/auth`)
- `POST /register`: `{ email, password, name, role }` $\rightarrow$ `{ user, accessToken }` + Set-Cookie (`devflow_refresh_token`).
- `POST /login`: `{ email, password }` $\rightarrow$ `{ user, accessToken }` + Set-Cookie (`devflow_refresh_token`).
- `POST /refresh`: Reads cookie $\rightarrow$ `{ accessToken }` + Rotated Set-Cookie.
- `POST /logout`: Clears session cookies $\rightarrow$ `{ success: true }`.
- `GET /github`: Initiates OAuth $\rightarrow$ `302 Redirect` + Set-Cookie (`devflow_oauth_state`).
- `GET /github/callback`: Validates state $\rightarrow$ `302 Redirect` to `/auth/callback?code=...` or `/auth/link-account` + Set-Cookie (`devflow_linking_challenge`).
- `POST /oauth/exchange`: `{ code }` $\rightarrow$ `{ user, accessToken }` + Cookie.
- `GET /oauth/link-account/status`: Reads challenge cookie $\rightarrow$ `{ email: string, requiresPassword: boolean }`.
- `POST /oauth/link-account/send-otp`: Dispatches OTP to existing user's verified email $\rightarrow$ `{ success: true, cooldownSeconds: 60 }`.
- `POST /oauth/link-account`: `{ password?: string, verificationCode?: string }` $\rightarrow$ `{ user, accessToken }` + Cookie.

#### 2. Users (`/api/users`)
- `GET /me`: Authenticated user profile, global role, and GitHub connection status.
- `PATCH /me`: `{ name?, avatarUrl?, bio? }` $\rightarrow$ Updated `User`.
- `GET /:id`: Public profile (name, avatarUrl, bio, completed project statistics).

#### 3. Projects (`/api/projects`)
- `POST /`: `{ title, description?, budget?, currency?, brief? }` $\rightarrow$ `Project` (Atomically grants creator `OWNER` role).
- `GET /`: List projects user belongs to (Pagination: `?page=1&limit=20&status=ACTIVE`) $\rightarrow$ `{ items: Project[], total: number }`.
- `GET /:id`: Project details including `createdBy`, counterparties, milestones, and members.
- `PATCH /:id`: `{ title?, description?, budget? }` $\rightarrow$ `Project` (Owner only).
- `POST /:id/archive`: Archive project $\rightarrow$ `{ success: true, isArchived: true }` (Owner only).

#### 4. Project Members (`/api/projects/:id/members`)
- `GET /`: List project members and their roles.
- `DELETE /:memberId`: Remove member from project (Owner only; cannot remove assigned counterparties).

#### 5. Project Invitations (`/api/projects/:projectId/invitations` & `/api/invitations`)
- `POST /api/projects/:projectId/invitations`: `{ email, role: ProjectInvitationRole }` $\rightarrow$ `ProjectInvitation` (Owner only).
- `GET /api/projects/:projectId/invitations`: List pending invitations for project.
- `DELETE /api/projects/:projectId/invitations/:invitationId`: Revoke pending invitation (Owner only).
- `GET /api/invitations/:token`: Public lookup of invitation metadata `{ projectTitle, inviterName, role, email }`.
- `POST /api/invitations/:token/accept`: Accepts invitation; atomically updates membership and counterparty.
- `POST /api/invitations/:token/decline`: Declines invitation $\rightarrow$ `{ success: true }`.

#### 6. Milestones (`/api/milestones`)
- `POST /`: `{ projectId, title, paymentAmount, requirements, orderIndex?, dueDate? }` $\rightarrow$ `Milestone`. (Validates `paymentAmount > 0`).
- `GET /:id`: Milestone details with evidence, approvals, and payment status.
- `PATCH /:id`: Update requirements or due date before evidence submission.
- `POST /:id/submit`: Developer submits evidence $\rightarrow$ Transitions to `EVIDENCE_SUBMITTED`.
- `POST /:id/approve`: Client approves deliverable $\rightarrow$ Transitions to `APPROVED` (Gated by Anti-Self-Approval).
- `POST /:id/reject`: `{ reason: string }` $\rightarrow$ Transitions to `REJECTED`.
- `POST /:id/publish`: Publish verification proof $\rightarrow$ `{ publicVerificationUrl }`.
- `POST /:id/unpublish`: Revoke public verification proof $\rightarrow$ `{ isPubliclyVisible: false }`.

#### 7. Public Verification Proof (`/api/verify/:token`)
- **`GET /api/verify/:token`** (Public, Unauthenticated):
  - Returns `PublicVerificationResponseSchema`: `{ publicToken, milestoneTitle, milestoneDescription, requirements, verificationStatus, overallScore, verifiedAt, verificationSummary }`.
  - Excludes all PII, emails, database UUIDs, repository URLs, and payment amounts.

#### 8. Evidence (`/api/evidence` & `/api/milestones/:id/evidence`)
- `POST /api/milestones/:id/evidence`: Multipart file upload or JSON commit/PR/text metadata $\rightarrow$ `Evidence`.
- `GET /api/milestones/:id/evidence`: List all evidence items submitted for milestone.
- `DELETE /api/evidence/:id`: Soft-delete evidence item before milestone approval.

#### 9. AI Analysis (`/api/ai`)
- `POST /parse-brief`: `{ briefText: string }` $\rightarrow$ Suggested milestone roadmap.
- `POST /verify/:milestoneId`: Analyzes submitted evidence against requirements $\rightarrow$ `VerificationResult`.
- `POST /risk-assessment/:projectId`: Scans milestones and evidence for timeline/dependency risks.

#### 10. Payments & Invoices (`/api/payments`)
- `POST /invoices`: `{ milestoneId: string }` $\rightarrow$ `Payment` (`DRAFT`) (Milestone must be `APPROVED` and both counterparties assigned).
- `POST /:id/send`: Dispatches invoice to Client email via PayPal API $\rightarrow$ `Payment` (`SENT`).
- `POST /:id/reconcile`: Reconciles timeout or queries PayPal API for latest status $\rightarrow$ `Payment`.
- `POST /:id/cancel`: Cancels draft/sent invoice via PayPal Invoicing API $\rightarrow$ `Payment` (`CANCELLED`).
- `POST /:id/refund`: `{ captureId: string, grossAmount: number, reason?: string }` (Header: `Idempotency-Key: <client-uuid>`) $\rightarrow$ Processes refund reservation and external dispatch. Enforces client-supplied `Idempotency-Key`. If retried with identical payload, returns existing refund record (`{ refundId, status, isRetry: true }`); if retried with mismatched payload, rejects with HTTP 409 Conflict (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`). Preempts active `INITIATED` payouts if necessary; defers with HTTP 409 Conflict (`PAYOUT_IN_FLIGHT`) if colliding with in-flight `PROCESSING` payouts.

#### 11. Payouts (`/api/payments/:id/payout`)
- `POST /initiate`: Admin initiates payout `{ provider: 'PAYPAL_PAYOUTS' | 'MANUAL_TRANSFER', amount, beneficiaryEmail }` $\rightarrow$ Verifies Option B settlement (`Payment.paidAt IS NOT NULL` and `status` in `['PAID', 'PARTIALLY_REFUNDED']`), validates `requestedAmount <= availablePayoutHeadroom`, generates UUID idempotency key, creates `PayoutRecord` (`INITIATED`). For `PAYPAL_PAYOUTS`, dispatches batch to PayPal Payouts API and transitions to `PROCESSING`.
- `POST /confirm`: Admin records manual transfer confirmation (`MANUAL_TRANSFER` mode only) $\rightarrow$ Strictly requires `transferReference` (wire/IMAD ID), `evidenceDocumentUrl` (bank receipt), and `notes`; transitions `INITIATED` $\rightarrow$ `DISBURSED` with immutable audit entry. Strictly rejected for `PAYPAL_PAYOUTS` mode (which requires provider webhook confirmation).
- `POST /cancel`: Admin cancels un-disbursed payout in `INITIATED` status $\rightarrow$ Releases reserved funds back to available headroom.
- `GET /`: List payout records, execution modes, and reconciliation audit history for payment.

#### 12. Dashboard Analytics (`/api/dashboard`)
- `GET /stats`: Aggregated metrics $\rightarrow$ `{ activeProjects, completedMilestones, platformHeldAmount, reservedAmount, disbursedAmount }`.
- `GET /projects/:id/stats`: Project metrics $\rightarrow$ `{ progressPercentage, budgetUtilized, pendingMilestones }`.

#### 13. Notifications (`/api/notifications`)
- `GET /`: List notifications for authenticated user (Pagination: `?page=1&limit=20&unreadOnly=true`).
- `PATCH /:id/read`: Mark single notification as read $\rightarrow$ `{ success: true }`.
- `POST /mark-all-read`: Mark all notifications as read $\rightarrow$ `{ count: number }`.

#### 14. Activity Logs (`/api/activity-logs`)
- `GET /projects/:projectId`: Chronological project activity audit trail.

#### 15. GitHub Integration (`/api/github`)
- `GET /repos`: List repositories accessible via user's linked GitHub account.
- `GET /repos/:owner/:repo/commits`: Fetch commits for evidence attachment.
- `GET /repos/:owner/:repo/pulls`: Fetch PRs for evidence attachment.

#### 16. Webhooks (`/api/webhooks/paypal`)
- `POST /`: PayPal inbound webhook receiver. Validates signature via PayPal API, ensures idempotency, and reconciles invoice settlement and refunds.

---



---

## 11. Mandatory Adversarial Financial Test Suite & 10-Phase Roadmap

### 11.1 Adversarial Financial Test Suite (24 Formal Specifications)

To verify financial, relational, and concurrency correctness under adversarial edge conditions, the backend test harness defines 24 automated integration test specifications. All tests are executed against an isolated PostgreSQL instance during Phase 6.

```typescript
// backend/tests/adversarialFinance.test.ts [Specification only — Proposed, not yet executed]
describe("Adversarial Financial Integrity & Settlement Tests (24 Formal Specifications)", () => {

  it("1. Final capture completes invoice to PAID and milestone to PAID while fee verification remains pending", async () => {
    // Setup: Invoice snapshotAmount = $1,000.00. Capture of $1,000.00 arrives with status = COMPLETED, feeStatus = PENDING_CONFIRMATION.
    // Operation: syncPaymentAggregates(tx, payment.id).
    // Expected DB State: Payment.settledAmount = 1000.00, Payment.status = PAID, Milestone.status = PAID (contractual delivery satisfied).
    //                    Payment.netReceivedAmount = 0.00, Payment.payoutStatus = DISBURSEMENT_PAUSED, pauseReasons = ['UNVERIFIED_CAPTURES_1'].
    //                    availablePayoutHeadroom = 0.00.
    // Expected API Outcome: Milestone displays as paid to client and developer; POST /api/payments/:id/payout/initiate returns 409 Conflict (PAYOUTS_PAUSED: UNVERIFIED_CAPTURES_1).
  });

  it("2. Manual-review capture blocks payout", async () => {
    // Setup: Invoice $500.00. Capture arrives with status = COMPLETED, feeStatus = MANUAL_REVIEW_REQUIRED.
    // Operation: Webhook ingestion or reconciliation runner calls syncPaymentAggregates().
    // Expected DB State: Payment.payoutStatus = DISBURSEMENT_PAUSED, manualReviewCapturesCount = 1, pauseReasons = ['MANUAL_REVIEW_CAPTURES_1'].
    // Expected API Outcome: POST /api/payments/:id/payout/initiate returns 409 Conflict (PAYOUTS_PAUSED: MANUAL_REVIEW_CAPTURES_1).
  });

  it("3. Partial refund lifecycle transition to PARTIALLY_REFUNDED retains original verified net and deducts only refund amount", async () => {
    // Setup: $1,000.00 capture settled (feeAmount = 34.90, netAmount = 965.10, feeStatus = VERIFIED).
    //        Client receives a $300.00 partial refund (netDeductedAmount = 291.30, feeReversalAmount = 8.70).
    // Operation: Call syncPaymentAggregates().
    // Expected DB State: Payment.status = PARTIALLY_REFUNDED.
    //                    Payment.settledAmount = 1000.00, Payment.netReceivedAmount = 965.10 (original verified net permanently retained in capture ledger).
    //                    Payment.refundedAmount = 300.00, Payment.netRefundDeducted = 291.30, Payment.feeAmount = 26.20.
    //                    netPlatformCash = 965.10 - 291.30 = 673.80. ledgerDeficit = false. availablePayoutHeadroom = 673.80.
    // Expected API Outcome: Milestone remains PAID; Payment status is PARTIALLY_REFUNDED; remaining available payout to developer is exactly $673.80 with zero double-deduction.
  });

  it("4. Full refund lifecycle transition to REFUNDED does not double-count reversal when both capture status and refund record indicate reversal", async () => {
    // Setup: $500.00 capture (gross = 500.00, fee = 17.45, net = 482.55). Client receives full $500.00 refund (feeReversal = 17.45, netDeducted = 482.55).
    //        Capture status transitions to REFUNDED.
    // Operation: Call syncPaymentAggregates().
    // Expected DB State: Payment.status = REFUNDED. grossCaptured = 500.00, verifiedNet = 482.55. netRefundDeductions = 482.55. Deductions applied exactly once via PaymentRefund record.
    //                    netPlatformCash = 482.55 - 482.55 = 0.00. ledgerDeficit = false. availablePayoutHeadroom = 0.00.
    // Expected API Outcome: Payment transitions to REFUNDED; no false deficit detected; net platform cash balances to exactly 0.00.
  });

  it("5. Capture reversal without corresponding refund record creates discrepancy, provisional gross deduction, sets MANUAL_RECONCILIATION_REQUIRED, and blocks payouts", async () => {
    // Setup: $1,000.00 capture in database (gross = $1,000.00, fee = $34.90, net = $965.10). PayPal webhook delivers capture reversal
    //        setting PaymentCapture.status = REFUNDED, but no corresponding PaymentRefund row exists yet (unrecorded Resolution Center chargeback).
    // Operation: Run syncPaymentAggregates().
    // Expected DB State: System detects unrecordedReversalDifference = $1,000.00. Under fee-reversal uncertainty,
    //                    provisional unrecorded deduction conservatively treats full gross as clawed back ($1,000.00).
    //                    inconsistentCapturesCount = 1, discrepancies contains 'CAPTURE_<id>_UNRECORDED_PROVIDER_FULL_REVERSAL_DELTA_1000.00'.
    //                    netPlatformCash = 965.10 - 1000.00 = -34.90 (fee deficit). Payment.status = MANUAL_RECONCILIATION_REQUIRED,
    //                    Payment.payoutStatus = DISBURSEMENT_PAUSED. Payment and Milestone NEVER transition to PAID.
    // Expected API Outcome: Disbursements strictly halted; high-priority alert raised for unrecorded provider reversal requiring reconciliation.
  });

  it("6. Provider partial reversal amount mismatch against completed refund records triggers MANUAL_RECONCILIATION_REQUIRED and blocks payouts", async () => {
    // Setup: $1,000.00 capture (gross = $1,000.00, fee = $34.90, net = $965.10). Provider webhook indicates capture status = PARTIALLY_REFUNDED
    //        with rawResponse.refunded_amount.value = "400.00". However, local database only has one completed PaymentRefund record of grossAmount = $150.00.
    // Operation: Run syncPaymentAggregates().
    // Expected DB State: completedRefundsGross = $150.00 vs providerRefundedGross = $400.00 (unrecorded difference = $250.00).
    //                    System flags inconsistentCapturesCount = 1, hasUnreconciledProviderReversal = true,
    //                    pauseReasons contains 'UNRECONCILED_PARTIAL_REVERSAL_<id>',
    //                    discrepancies contains 'CAPTURE_<id>_PARTIAL_REVERSAL_AMOUNT_MISMATCH_RECORDED_150.00_VS_PROVIDER_400.00'.
    //                    Unrecorded delta of $250.00 is provisionally deducted from platform cash.
    //                    Payment.status = MANUAL_RECONCILIATION_REQUIRED (cannot remain PAID or clean PARTIALLY_REFUNDED).
    //                    Payment.payoutStatus = DISBURSEMENT_PAUSED, availablePayoutHeadroom = 0.00.
    // Expected API Outcome: Payouts strictly paused; reconciliation worker flags discrepancy requiring manual audit.
  });

  it("7. Seamless reversal hand-off: subsequently ingested refund record replaces provisional unrecorded reversal delta without double-counting", async () => {
    // Setup: Capture has status = PARTIALLY_REFUNDED and providerRefundedGross = $400.00. Initially, completed refunds = $0.00 (unrecorded delta = $400.00).
    //        Payment.status = MANUAL_RECONCILIATION_REQUIRED, provisional deduction = $400.00.
    // Operation: Delayed webhook or reconciliation ingestion creates PaymentRefund(gross = 400.00, netDeducted = 388.40, status = COMPLETED).
    //            syncPaymentAggregates() is invoked.
    // Expected DB State: completedRefundsGrossByCapture ($400.00) matches providerRefundedGross ($400.00).
    //                    unrecordedDelta drops to max(0, 400.00 - 400.00) = $0.00! Provisional deduction vanishes.
    //                    Permanent refund deduction ($388.40) is applied exactly once via PaymentRefund.
    //                    hasUnreconciledProviderReversal = false. Payment.status transitions to PARTIALLY_REFUNDED.
    // Expected API Outcome: Zero double-deduction; reconciliation resolves automatically; available payout headroom updates cleanly.
  });

  it("8. Recovery from resolved payout pause versus preservation of independent administrative hold", async () => {
    // Setup Case A: Payment has payoutStatus = DISBURSEMENT_PAUSED due to UNVERIFIED_CAPTURES_1. When capture fee verification arrives
    //               (feeStatus = VERIFIED), syncPaymentAggregates() clears pause reasons. Because reconciliationNotes does NOT contain ADMIN_HOLD,
    //               Payment.payoutStatus transitions to PLATFORM_HELD, and availablePayoutHeadroom unlocks.
    // Setup Case B: Payment has payoutStatus = DISBURSEMENT_PAUSED, but an administrator has placed an explicit hold
    //               (reconciliationNotes contains 'ADMIN_HOLD: Compliance AML Review'). Capture fee verification arrives (feeStatus = VERIFIED).
    // Operation: syncPaymentAggregates() runs for Case B. All financial pause reasons are cleared (pauseReasons = []).
    // Expected DB State for Case B: System recognizes independent administrative hold. Payment.payoutStatus remains DISBURSEMENT_PAUSED,
    //                               availablePayoutHeadroom remains 0.00.
    // Expected API Outcome: Automated reconciliation never overrides an intentional human administrator hold; ActivityLog records hold preservation.
  });

  it("9. Capture reversal after complete disbursement correctly detects resulting ledger deficit", async () => {
    // Setup: $1,000.00 invoice settled (gross = $1,000.00, fee = $34.90, net = $965.10). Freelancer disbursed $965.10 (PayoutRecord.status = DISBURSED).
    //        Payer subsequently initiates a bank chargeback; PayPal reverses the $1,000.00 capture. Refund record ingested with verified fee reversal
    //        (netDeductedAmount = $965.10, feeReversalAmount = $34.90).
    // Operation: Ingest confirmed refund record and run syncPaymentAggregates().
    // Expected DB State: netPlatformCash = 965.10 - 965.10 - 965.10 = -965.10. ledgerDeficit = true, deficitAmount = 965.10.
    //                    Payment.status = MANUAL_RECONCILIATION_REQUIRED, Payment.payoutStatus = DISBURSEMENT_PAUSED.
    // Expected API Outcome: System flags catastrophic ledger deficit; all future disbursements across project halted until operator resolves debt.
  });

  it("10. Two concurrent refunds cannot exceed capture gross balance", async () => {
    // Setup: $1,000.00 capture. Two concurrent API requests arrive simultaneously: Refund 1 for $600.00, Refund 2 for $500.00.
    // Operation: Both requests invoke processRefund() wrapped in database transactions with Tier 2 FOR UPDATE locks on PaymentCapture.
    // Expected DB State: Transaction 1 locks capture row, validates $600 <= $1,000, inserts PaymentRefund(gross = 600.00, status = PENDING), commits.
    //                    Transaction 2 acquires lock, evaluates remaining balance ($1,000 - $600 = $400), detects $500 > $400.
    // Expected API Outcome: Request 1 succeeds (HTTP 200 OK); Request 2 is rejected with HTTP 400 Bad Request (REFUND_EXCEEDS_BALANCE).
  });

  it("11. Multiple refunds whose combined fee reversals exceed original capture fee are rejected", async () => {
    // Setup: $1,000.00 capture with feeAmount = $34.90.
    //        Refund 1 of $500.00 records feeReversalAmount = $20.00.
    //        Refund 2 of $500.00 attempts feeReversalAmount = $20.00 (total = $40.00 > $34.90 fee).
    // Operation: Second refund transaction attempts to insert row.
    // Expected DB State: Cumulative fee-reversal check detects totalReversals ($40.00) > capture.feeAmount ($34.90).
    // Expected API Outcome: Transaction rejects with HTTP 400 Bad Request (FEE_REVERSAL_EXCEEDS_ORIGINAL_FEE).
  });

  it("12. Concurrent fee-reversal reservations are serialized without race conditions", async () => {
    // Setup: $1,000.00 capture with feeAmount = $34.90. Two concurrent refunds attempt to reserve fee reversals simultaneously ($20.00 each).
    // Operation: Concurrent execution of refund reservation transactions.
    // Expected DB State: PostgreSQL row-level locking on PaymentCapture forces serial execution. First reservation succeeds ($20.00 reserved).
    //                    Second reservation evaluates remaining fee headroom ($34.90 - $20.00 = $14.90) and caps or rejects second reversal.
    // Expected API Outcome: Exactly one transaction secures $20.00 reversal; zero over-allocation occurs.
  });

  it("13. Duplicate refund execution prevention: client-supplied idempotency key returns existing refund on retry and rejects payload mismatch", async () => {
    // Setup: Client submits refund with Idempotency-Key = "client-uuid-101", grossAmount = $200.00.
    // Operation 1: First request commits PaymentRefund(id = "ref-1", gross = 200.00, status = PENDING).
    // Operation 2: Client retries identical request with Idempotency-Key = "client-uuid-101", grossAmount = $200.00.
    // Operation 3: Attacker or buggy client submits Idempotency-Key = "client-uuid-101" with grossAmount = $500.00.
    // Expected DB State: Exactly one PaymentRefund record exists in database. No second deduction or payout preemption occurs on retry.
    // Expected API Outcome: Operation 2 returns HTTP 200 OK with existing record { refundId: "ref-1", status: "PENDING", isRetry: true }.
    //                       Operation 3 rejects with HTTP 409 Conflict (IDEMPOTENCY_KEY_PAYLOAD_MISMATCH).
  });

  it("14. Multi-capture refund headroom evaluation: refund against one capture derives platform cash from payment-wide multi-capture aggregates", async () => {
    // Setup: Payment settled via two captures: Capture A = $600.00 (net = $578.00, verified), Capture B = $400.00 (net = $386.00, verified).
    //        Payment-wide verified net = $964.00. Admin initiated Payout 1 = $500.00 (INITIATED).
    //        Client submits a refund of $300.00 against Capture B.
    // Operation: processRefund() evaluates cash under Tier 1-4 locks using syncPaymentAggregates().
    // Expected DB State: Available cash is derived across both captures ($964.00), not merely Capture B ($386.00).
    //                    Projected cash = $964.00 - $500.00 - $300.00 = $164.00 >= 0. No payout preemption needed.
    // Expected API Outcome: Refund succeeds cleanly; Payout 1 remains INITIATED without spurious cancellation.
  });

  it("15. Concurrency race: incoming refund preempts multiple INITIATED payouts, cancelling reservations and creating ActivityLog entries", async () => {
    // Setup: $1,000.00 invoice settled (net received = $965.10). Admin initiated Payout 1 ($400.00) and Payout 2 ($400.00), total reserved = $800.00.
    //        A client refund request of $600.00 arrives before either payout is dispatched.
    // Operation: processRefund() evaluates projected cash: $965.10 - $800.00 - $600.00 = -$434.90.
    //            System loops through initiated payouts (sorted newest first):
    //            Cancels Payout 2 ($400.00, freed = $400.00 < $434.90).
    //            Cancels Payout 1 ($400.00, cumulative freed = $800.00 >= $434.90).
    // Expected DB State: Both Payout 1 and Payout 2 transition to CANCELLED with failureReason = 'SUPERSEDED_BY_REFUND'.
    //                    Two ActivityLog entries created (action = PAYOUT_CANCELLED_BY_REFUND).
    //                    Both reservations released; client refund committed with status = PENDING.
    // Expected API Outcome: Refund returns 200 OK; operational dashboard reflects both payouts cancelled by refund preemption.
  });

  it("16. Concurrency race: atomic payout-dispatch claim prevents submission of cancelled payout and blocks refund cancellation once claimed", async () => {
    // Setup: PayoutRecord in INITIATED status.
    // Scenario A (Claim precedes refund):
    //   Worker executes claimPayoutForDispatch(): locks record, verifies status === INITIATED, updates status = PROCESSING, commits DB transaction.
    //   Incoming refund transaction arrives next: sees payout status === PROCESSING, recognizes transfer is in-flight, and rejects refund with 409 Conflict.
    // Scenario B (Refund precedes claim):
    //   Refund arrives, preempts and cancels payout: updates status = CANCELLED, commits DB transaction.
    //   Worker executes claimPayoutForDispatch(): locks record, evaluates status === CANCELLED !== INITIATED, throws PAYOUT_NOT_DISPATCHABLE.
    // Expected DB State: Under no interleaving does a worker submit an externally cancelled payout, and under no interleaving does a refund cancel an in-flight payout.
    // Expected API Outcome: Complete mutual exclusion and zero phantom deficits.
  });

  it("17. Concurrency race: incoming refund during PROCESSING payout must defer/reject with 409 Conflict to prevent phantom deficit", async () => {
    // Setup: $1,000.00 invoice (net received = $965.10). Payout of $900.00 has been claimed and is in-flight in PayPal banking rails (status = PROCESSING).
    //        Client requests $400.00 refund.
    // Operation: System evaluates projected headroom under Tier 1-4 locks: $965.10 - $400.00 - $900.00 = -$334.90 < 0.
    // Expected DB State: Payout transfer is in-flight with provider rails and cannot be cancelled or aborted. In-flight payout remains PROCESSING.
    //                    PROCESSING payout is NOT treated as confirmed cash disbursement yet, but acts as a firm reservation against headroom.
    // Expected API Outcome: Client API refund is rejected/deferred with 409 Conflict (code: PAYOUT_IN_FLIGHT, message: "Disbursement of $900.00 is currently in-flight with provider rails. Refund cannot be processed until payout completes or fails.").
  });

  it("18. Forced external webhook refund during processing payout flags operational risk without misrepresenting as confirmed cash deficit", async () => {
    // Setup: Payout of $900.00 is PROCESSING. A forced PayPal chargeback webhook of $400.00 arrives externally.
    // Operation: Webhook must be accepted. System ingests refund and runs syncPaymentAggregates().
    // Expected DB State: Payment.payoutStatus = DISBURSEMENT_PAUSED with pause reason IN_FLIGHT_PAYOUT_COLLISION_RISK.
    //                    Payment.status is NOT set to MANUAL_RECONCILIATION_REQUIRED yet because payout is still in-flight.
    //                    When webhook PAYMENT.PAYOUTS-ITEM.SUCCEEDED arrives, status becomes DISBURSED, actual cash becomes -$334.90,
    //                    triggering ledgerDeficit = true and updating Payment.status = MANUAL_RECONCILIATION_REQUIRED.
    // Expected API Outcome: Webhook returns 200 OK; operational dashboard flags collision risk.
  });

  it("19. Two-phase external PayPal operation sequencing: database reservation committed before HTTP call", async () => {
    // Setup: Client initiates $250.00 refund with Idempotency-Key = "uuid-two-phase".
    // Operation: Service begins DB transaction, acquires locks, inserts PaymentRefund(status = PENDING, idempotencyKey = "uuid-two-phase"),
    //            syncs aggregates, and commits DB transaction. Then makes HTTPS call to PayPal API outside DB transaction with PayPal-Request-Id.
    // Expected DB State: DB row locks held for < 5ms during reservation; zero database locks held during 400ms HTTPS round-trip.
    //                    On HTTP 201 response, second DB transaction updates status to COMPLETED and records paypalRefundId.
    // Expected API Outcome: Refund completes with zero database connection pool starvation.
  });

  it("20. Safe timeout recovery for external PayPal operations using idempotency key without losing reservations", async () => {
    // Setup: Payout claimed into PROCESSING with idempotencyKey = "uuid-payout-timeout". External HTTPS call to PayPal Payouts API times out (ETIMEDOUT).
    // Operation: Service catches timeout. Does NOT roll back DB reservation. Reconciliation worker queries PayPal by sender_batch_id.
    // Expected DB State: Reservation is preserved in DB. Worker discovers PayPal received and queued the batch; updates record with providerPayoutBatchId.
    // Expected API Outcome: Prevents double-payout submission and eliminates orphaned reservations.
  });

  it("21. Independent multi-tab token refresh: concurrent tabs use shared cookie and Web Locks to independently refresh in-memory tokens", async () => {
    // Setup: User opens Tab A and Tab B. Both access tokens expire simultaneously. Both tabs share HttpOnly refresh cookie (Token 1).
    // Operation: Both tabs request Web Lock 'devflow_auth_refresh'.
    //            Tab A acquires lock, calls POST /api/auth/refresh, rotates Token 1 to Token 2 in cookie jar, stores AccessTokenA in memory, releases lock.
    //            Tab B acquires lock, independently calls POST /api/auth/refresh with Token 2, rotates to Token 3, stores AccessTokenB in memory.
    // Expected DB State: RefreshToken table records family rotation: Token 1 replaced by Token 2, Token 2 replaced by Token 3. Zero family reuse revocations.
    // Expected API Outcome: Both Tab A and Tab B hold valid, isolated in-memory access tokens; subsequent authenticated requests in both tabs succeed.
  });

  it("22. Non-completed capture detection and payout blocking", async () => {
    // Setup: Invoice $1,000.00. Capture arrives with status = PENDING (in-flight bank clearing / ACH).
    // Operation: Webhook ingestion and aggregate derivation.
    // Expected DB State: Payment.settledAmount = 0.00 (non-completed captures do not settle invoice), pendingCapturesCount = 1.
    //                    Payment.payoutStatus = DISBURSEMENT_PAUSED, pauseReasons = ['PENDING_CAPTURES_1'].
    // Expected API Outcome: Invoice remains in SENT / PAYMENT_PENDING; payout initiation returns 409 Conflict (PAYOUTS_PAUSED: PENDING_CAPTURES_1).
  });

  it("23. Completed capture with missing verified fee or net data triggers manual review", async () => {
    // Setup: Invoice $800.00. Capture row has status = COMPLETED, feeStatus = VERIFIED, but feeAmount = null or netAmount = null.
    // Operation: Execute syncPaymentAggregates().
    // Expected DB State: inconsistentCapturesCount = 1, discrepancies contains 'CAPTURE_<id>_VERIFIED_MISSING_FEE_OR_NET'.
    //                    Payment.payoutStatus = DISBURSEMENT_PAUSED.
    // Expected API Outcome: Disbursements paused; GET /api/payments/:id/reconciliation reports discrepancy requiring manual review.
  });

  it("24. Cross-payment refund ownership is rejected by PostgreSQL composite constraint and currency mismatch rejected", async () => {
    // Setup: Payment A and Payment B created. Capture belongs to Payment B. Attempt to insert refund for Payment A referencing Capture B.
    // Operation: Execute tx.paymentRefund.create({ data: { paymentId: paymentA.id, captureId: captureB.id, ... } }).
    // Expected DB State: PostgreSQL composite foreign key fk_refund_capture_payment_ownership rejects row insertion with code 23503.
    //                    Attempting to insert a capture or refund with currency EUR for a USD payment is rejected with CURRENCY_MISMATCH.
    // Expected API Outcome: Transaction rolls back; 400 Bad Request / Foreign Key Violation.
  });
});
```

---

### 11.2 Revised 10-Phase Implementation Roadmap

#### Phase 1: Foundation, Database & Core Security
- **Objectives:** Express server, PostgreSQL connection via Prisma, shift-left security middleware, parsed environment validation, base test harness.
- **Dependencies:** `express`, `typescript`, `tsx`, `@prisma/client`, `prisma`, `zod`, `dotenv`, `helmet`, `cors`, `express-rate-limit`, `vitest`
- **Files to Create:**
  - `backend/package.json`
  - `backend/tsconfig.json`
  - `backend/src/server.ts`
  - `backend/src/app.ts`
  - `backend/src/config/env.ts` (Parsed environment schema)
  - `backend/src/config/database.ts` (Prisma singleton)
  - `backend/src/middleware/errorHandler.ts`
  - `backend/src/middleware/rateLimiter.ts`
  - `backend/src/utils/logger.ts`
  - `backend/src/utils/errors.ts`
  - `database/prisma/schema.prisma` (Complete 21-model schema v2.5.10)
  - `database/prisma/migrations/20261107_active_invoice_constraint/migration.sql`
  - `database/prisma/migrations/20261107_unique_pending_invitation/migration.sql`
  - `database/prisma/migrations/20261107_counterparty_separation_check/migration.sql`
  - `database/prisma/migrations/20261107_refund_capture_ownership_check/migration.sql`
  - `database/prisma/migrations/20261107_financial_amount_positive_checks/migration.sql`
  - `backend/vitest.config.ts`
  - `backend/tests/health.test.ts`
- **Verification Tests:**
  - Server boots with compliant local environment configuration.
  - `GET /api/health` asserts active PostgreSQL connection.
  - Database check constraint tests: asserts rejection of identical counterparties, cross-payment refunds, and negative financial amounts.

---

#### Phase 2: Authentication, Token Lifecycle & GitHub OAuth
- **Objectives:** User registration, bcrypt password hashing, in-memory JWT issuance, 2-step atomic refresh token rotation, token family revocation upon reuse, single-use password reset tokens, GitHub OAuth with PKCE and browser-bound state cookies, and protected account linking challenge flow.
- **Dependencies:** `bcrypt`, `jsonwebtoken`, `cookie-parser`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cookie-parser`
- **Files to Create:**
  - `backend/src/modules/auth/auth.controller.ts`
  - `backend/src/modules/auth/auth.service.ts`
  - `backend/src/modules/auth/auth.schema.ts`
  - `backend/src/modules/auth/auth.routes.ts`
  - `backend/src/middleware/auth.ts`
  - `backend/src/middleware/validate.ts`
  - `backend/src/utils/crypto.ts` (Token hashing, AES-256-GCM encryption)
  - `backend/tests/auth.test.ts`

---

#### Phase 3: Users, Projects, Counterparties & Invitations
- **Objectives:** User profiles, project creation with explicit `createdById` and atomic `OWNER` membership, database-enforced non-identity invariant (`clientId <> leadDeveloperId`), project invitations with partial unique index, atomic invitation acceptance with row locks, and two-tier RBAC middleware.
- **Files to Create:**
  - `backend/src/modules/users/users.controller.ts`
  - `backend/src/modules/users/users.service.ts`
  - `backend/src/modules/users/users.routes.ts`
  - `backend/src/modules/projects/projects.controller.ts`
  - `backend/src/modules/projects/projects.service.ts`
  - `backend/src/modules/projects/projects.schema.ts`
  - `backend/src/modules/projects/projects.routes.ts`
  - `backend/src/modules/invitations/invitations.controller.ts`
  - `backend/src/modules/invitations/invitations.service.ts`
  - `backend/src/modules/invitations/invitations.routes.ts`
  - `backend/src/middleware/authorize.ts` (Project RBAC guard)
  - `backend/tests/projects.test.ts`
  - `backend/tests/invitations.test.ts`

---

#### Phase 4: Milestones, Evidence & Approval History
- **Objectives:** Milestone CRUD, evidence uploads (local disk abstraction with MIME/size validation), anti-self-approval rule, resubmission flow, append-only approval history.
- **Dependencies:** `multer`, `uuid`, `@types/multer`, `@types/uuid`
- **Files to Create:**
  - `backend/src/modules/milestones/milestones.controller.ts`
  - `backend/src/modules/milestones/milestones.service.ts`
  - `backend/src/modules/milestones/milestones.schema.ts`
  - `backend/src/modules/milestones/milestones.routes.ts`
  - `backend/src/modules/evidence/evidence.controller.ts`
  - `backend/src/modules/evidence/evidence.service.ts`
  - `backend/src/modules/evidence/evidence.schema.ts`
  - `backend/src/modules/evidence/evidence.routes.ts`
  - `backend/src/services/storage.service.ts`
  - `backend/tests/milestones.test.ts`

---

#### Phase 5: AI Engine & Advisory Verification Service
- **Objectives:** Gemini 2.0 Flash integration with `@google/genai` (^0.1.1) SDK, structural parameter separation (`systemInstruction` inside `config`), regex secret scrubbing, strict JSON response schema, mock fallback provider.
- **Dependencies:** `@google/genai`
- **Files to Create:**
  - `backend/src/modules/ai/ai.controller.ts`
  - `backend/src/modules/ai/ai.service.ts`
  - `backend/src/modules/ai/ai.schema.ts`
  - `backend/src/modules/ai/ai.routes.ts`
  - `backend/src/modules/ai/providers/gemini.provider.ts`
  - `backend/src/modules/ai/providers/mock.provider.ts`
  - `backend/tests/ai.test.ts`

---

#### Phase 6: PayPal Invoicing, Multi-Capture Reconciliation & Admin Disbursements
- **Objectives:** PayPal Invoicing v2 integration, 72-hour idempotency handling, multi-capture accounting with `PaymentCapture` and `PaymentRefund` models, composite foreign key ownership check, webhook signature verification, Option B settlement policy with retention across partial refunds, hierarchical lock ordering, adversarial test suite execution, and Global Admin payout authorization.
- **Files to Create:**
  - `backend/src/modules/payments/payments.controller.ts`
  - `backend/src/modules/payments/payments.service.ts`
  - `backend/src/modules/payments/payments.schema.ts`
  - `backend/src/modules/payments/payments.routes.ts`
  - `backend/src/modules/payments/payout.service.ts`
  - `backend/src/modules/payments/reconciliation.service.ts`
  - `backend/src/modules/webhooks/webhooks.controller.ts`
  - `backend/src/modules/webhooks/webhooks.service.ts`
  - `backend/src/modules/webhooks/webhooks.routes.ts`
  - `backend/src/services/paypal.service.ts`
  - `backend/tests/payments.test.ts`
  - `backend/tests/refundOwnership.test.ts`
  - `backend/tests/adversarialFinance.test.ts`

---

#### Phase 7: Canonical Public Verification Proof (`GET /api/verify/:token`)
- **Objectives:** Unauthenticated public milestone verification page endpoint.
- **Files to Create:**
  - `backend/src/modules/verification/publicVerification.controller.ts`
  - `backend/src/modules/verification/publicVerification.service.ts`
  - `backend/src/modules/verification/publicVerification.routes.ts`
  - `backend/tests/publicVerification.test.ts`

---

#### Phase 8: Notifications & Activity Logging
- **Objectives:** Real-time in-app notification dispatch and append-only activity audit trail.
- **Files to Create:**
  - `backend/src/modules/notifications/notifications.controller.ts`
  - `backend/src/modules/notifications/notifications.service.ts`
  - `backend/src/modules/notifications/notifications.routes.ts`
  - `backend/src/modules/activity/activity.service.ts`
  - `backend/src/modules/activity/activity.routes.ts`
  - `backend/tests/notifications.test.ts`

---

#### Phase 9: Dashboard Analytics & GitHub Integration
- **Objectives:** Project progress summaries, financial health statistics (partitioning platform-held, reserved, and disbursed funds without double counting), and GitHub REST API integration for pulling commits and PR evidence.
- **Files to Create:**
  - `backend/src/modules/dashboard/dashboard.controller.ts`
  - `backend/src/modules/dashboard/dashboard.service.ts`
  - `backend/src/modules/dashboard/dashboard.routes.ts`
  - `backend/src/services/github.service.ts`
  - `backend/tests/dashboard.test.ts`

---

#### Phase 10: End-to-End Integration & PayPal Sandbox Audit
- **Objectives:** Full system walkthrough from user registration through AI milestone verification, human approval, PayPal sandbox invoice payment, and webhook status reconciliation.
- **Files to Create:**
  - `backend/tests/e2e/workflow.test.ts`

---



---



---

## 12. External Prerequisites, Verification Discipline Ledger & Decisions Requiring Human Approval

### 12.1 Local Prerequisites Before Starting Phase 1
1. **PostgreSQL Container:** Ensure PostgreSQL 16 is running on `127.0.0.1:5432` via `docker compose up -d`.
2. **Phase 1 Environment (`backend/.env`):**
   ```env
   NODE_ENV=development
   PORT=3001
   DATABASE_URL=postgresql://devflow:devflow@localhost:5432/devflow?schema=public
   CLIENT_URL=http://localhost:5173
   POSTGRES_PASSWORD=devflow
   
   # Local development secret ONLY — never commit real secrets or use in production.
   # Complies with validator: >= 32 characters, contains no blacklisted substrings.
   JWT_SECRET=devflow_local_jwt_auth_signing_token_2026_d8f7a1e3b5c9
   ```

---

### 12.2 Verification Discipline Ledger

To maintain strict architectural transparency, every technical assertion is categorized below by its actual verification status:

| Architectural Component | Verification Status | Verification Category & Exact Mechanism |
|---|---|---|
| **Local Monorepo Filesystem** | ✅ **Verified** | **Verified by command execution:** `git log -n 5`, `git rev-parse HEAD`, and recursive directory audit inspected commit `54813f04f38452509ec216dfa4fb4cbe411a4c0c`. Confirmed workspace contains directory skeletons with `.gitkeep` files and `frontend/README.md`. |
| **Git Working Tree State** | ✅ **Verified** | **Verified by command execution:** `git status` executed in `DevFlow/` confirms working tree is 100% clean with zero untracked or modified files. |
| **Remote Git Origin Sync** | ⚠️ **Unverified** | **Blocked by missing environment access:** Sandboxed execution environment blocks outbound network socket connections (`getaddrinfo` failure on fetch). Latest remote commits on GitHub origin cannot be audited from this container. |
| **Prisma Schema & Model Count (21 Models)** | 🔍 **Verified** | **Verified by static inspection:** Complete 21-model Prisma schema, forward/inverse relations, enum values (`CaptureStatus`, `PayoutProvider`, `PaymentStatus`, `PaymentPayoutStatus`), single `idempotencyKey` declaration in `PayoutRecord`, and field `@map("snake_case")` attributes verified by architectural code review. *Prisma CLI (`npx prisma validate`) remains unexecuted as packages are not yet installed.* |
| **PostgreSQL SQL Migrations** | 🔍 **Verified** | **Verified by static inspection:** Checked SQL syntax for active invoice partial index, invitation partial index, counterparty separation check, composite foreign key constraint ordering, and zero-permissive positive financial check constraints. *Migrations remain unapplied pending Phase 1.* |
| **Environment Validation Logic** | 🔍 **Verified** | **Verified by static inspection:** Verified Zod schema refinement logic: parsed environment object validation, `JWT_SECRET` blacklist filtering, and production mock AI rejection. |
| **`@google/genai` SDK Call Structure** | 🔍 **Verified** | **Verified by static inspection:** Validated against official Google Gen AI SDK (^0.1.1) specification: configuration options (`systemInstruction`, `responseMimeType`, `responseSchema`) are nested under `config: { ... }`. |
| **PayPal Sandbox Endpoints** | ⚠️ **Unverified** | **Blocked by missing credentials:** Live HTTP requests to `api-m.sandbox.paypal.com` are unexecuted pending sandbox credentials provisioned in local `.env`. |
| **Adversarial Test Execution** | 📋 **Proposed** | **Proposed but not executed:** 20 adversarial financial tests are fully specified in Section 11.1; execution will occur during Phase 6 automated test runs. |

---

### 12.3 Decisions Requiring Final Human Confirmation
1. **Historical Capture Proceeds Retention & Reversal Offsets:** Approval of permanently retaining original gross and verified net proceeds on settled captures while tracking all cash deductions strictly through separate negative refund events, with provisional unrecorded reversal deductions under fee uncertainty.
2. **Dual-Mode Payout Framework (`PAYPAL_PAYOUTS` vs `MANUAL_TRANSFER`):** Approval of supporting both automated PayPal Payouts and evidence-backed manual bank transfers, enforcing the invariant that no payout is marked `DISBURSED` without provider webhook verification or manual transfer evidence.
3. **Safe Two-Phase External PayPal Sequencing:** Approval of the two-phase outbox pattern (pre-call DB reservation with UUID idempotency key, external HTTP call outside DB transaction, post-call DB ingestion, safe worker timeout recovery).
4. **Deterministic Hierarchical Lock Ordering:** Approval of universal lock hierarchy (`Payment` $\rightarrow$ `Captures` $\rightarrow$ `Refunds` $\rightarrow$ `Payouts`).
5. **Phase 1 Implementation Authorization:** Explicit authorization to initialize `backend/` and commence **Phase 1: Foundation, Database & Core Security**.

---

*End of Architecture Report v2.5.11. Ready to commence Phase 1 upon explicit user approval.*
