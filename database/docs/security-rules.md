# DevFlow – Database Security Rules

## 1. Milestone Approval Security

### Rule: AI Must Not Independently Approve Milestones

**Enforcement:**
- `milestone_approvals.approved_by` is `NOT NULL` with FK → `users.id`
- No API endpoint accepts `approved_by = null` or a system/bot user ID
- The `milestones.status` can only transition to `approved` after a `milestone_approvals` row exists with a real human user

**Application layer requirement:**
- The milestone approval endpoint must verify the authenticated user has an appropriate role in the project (`owner` or `client`)
- AI analysis results (`ai_analyses`) are advisory — they populate the `overall_score`, `findings`, and `summary` fields but never trigger status transitions

### Rule: Human Authorization for Financial Actions

**Enforcement:**
- `invoices.created_by` is `NOT NULL` with FK → `users.id`
- Invoice creation requires an authenticated user with project membership
- Application logic must verify `milestones.status = 'approved'` before allowing invoice creation

---

## 2. PayPal Security

### Rule: PayPal Credentials Remain Server-Side

**Enforcement:**
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are stored in `.env` only
- `.gitignore` excludes `.env` and `.env.*` (except `.env.example`)
- No database column stores PayPal API credentials
- API responses must never include PayPal credentials

### Rule: Payment Status from Webhooks Only

**Enforcement:**
- The `payments` table is designed for INSERT-only from the webhook handler
- No REST API endpoint should allow direct `payments` writes or `invoices.status` updates to `paid`
- The payment flow:
  1. PayPal sends webhook → backend receives it
  2. Backend verifies webhook signature (PayPal webhook verification API)
  3. Backend creates `webhook_events` row (idempotency check)
  4. Backend creates `payments` row
  5. Backend updates `invoices.status` to `paid`
  6. All in a single database transaction

### Rule: Idempotent Webhook Processing

**Enforcement:**
- `webhook_events` has `UNIQUE(source, event_id)` constraint
- Processing flow:
  ```
  BEGIN TRANSACTION
    INSERT INTO webhook_events (source, event_id, ...)
    -- If UNIQUE violation → duplicate → skip
    -- If success → process the event
    UPDATE invoices SET status = 'paid' WHERE ...
    INSERT INTO payments ...
  COMMIT
  ```
- Duplicate webhook deliveries are safely ignored

### Rule: Store Identifiers, Not Credentials

**What IS stored:**
- `invoices.paypal_invoice_id` — PayPal's invoice identifier
- `invoices.paypal_invoice_url` — PayPal payment link
- `payments.paypal_payment_id` — PayPal transaction ID
- `payments.paypal_payer_id` — PayPal payer identifier
- `webhook_events.event_id` — PayPal webhook event ID

**What is NEVER stored:**
- Credit card numbers
- Bank account numbers
- PayPal access tokens
- PayPal refresh tokens
- PayPal API secrets
- Payer passwords or PINs

---

## 3. GitHub Token Security

### Rule: Encrypt Access Tokens

- `users.github_access_token` stores the GitHub OAuth access token for API calls
- **Application requirement:** This value must be encrypted at the application level before storage (e.g., AES-256-GCM with a server-side encryption key from environment variables)
- The encryption key must be stored in `.env`, not in the database
- Token should be decrypted only when making GitHub API calls, never returned in API responses

---

## 4. Data Integrity Rules

### Monetary Values
- All amounts use `DECIMAL(12,2)` — no floating-point arithmetic
- Currency codes stored alongside amounts (`VARCHAR(3)`, ISO 4217)
- Check constraints recommended: `amount > 0` for invoices and payments

### Timestamps
- All timestamps use `TIMESTAMPTZ` (timezone-aware)
- Critical for payment reconciliation across time zones

### Audit Trail
- `audit_logs` table is **INSERT-only** at the application level
- No UPDATE or DELETE operations on audit records
- Every financial action (approval, invoice creation, payment) must create an audit log entry
- System actions (webhook-triggered) use `user_id = NULL`

---

## 5. Environment Variable Checklist

| Variable | Security Level | Notes |
|---|---|---|
| `DATABASE_URL` | 🔴 Secret | Contains password; never commit |
| `JWT_SECRET` | 🔴 Secret | Token signing key |
| `GITHUB_CLIENT_SECRET` | 🔴 Secret | OAuth app secret |
| `PAYPAL_CLIENT_SECRET` | 🔴 Secret | PayPal API secret |
| `AI_PROVIDER_API_KEY` | 🔴 Secret | LLM API key |
| `POSTGRES_PASSWORD` | 🔴 Secret | Database password |
| `GITHUB_CLIENT_ID` | 🟡 Sensitive | OAuth app ID (public in OAuth flow, but don't expose unnecessarily) |
| `PAYPAL_CLIENT_ID` | 🟡 Sensitive | PayPal app ID |
| `PAYPAL_BASE_URL` | 🟢 Config | Sandbox vs production URL |
| `POSTGRES_DB` | 🟢 Config | Database name |
| `POSTGRES_USER` | 🟢 Config | Database username |

---

## 6. No Escrow Assumption

The current schema models **direct invoicing**:
- Milestone is approved → Invoice is created and sent → Client pays → Webhook confirms

There is no escrow, hold, or split-payment mechanism. If escrow is required, it would need:
- PayPal Commerce Platform integration (not standard Invoicing API)
- Additional tables: `escrow_holds`, `disbursements`
- Different PayPal API endpoints and webhook events
- Explicit project requirements documenting the escrow flow

This is intentionally excluded until requirements explicitly establish it.
