# DevFlow – Database Data Dictionary

This document details every column across all 14 tables in the DevFlow PostgreSQL database.

---

## 1. `users`

Represents platform accounts (authenticated via GitHub OAuth).

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | *(Prisma client uuid)* | PK | Primary identifier |
| `email` | `VARCHAR(255)` | No | — | UNIQUE | User contact email |
| `name` | `VARCHAR(255)` | No | — | — | Full display name |
| `avatar_url` | `TEXT` | Yes | — | — | Profile image URL |
| `github_id` | `VARCHAR(100)` | Yes | — | UNIQUE | GitHub numeric/string user ID |
| `github_username` | `VARCHAR(100)` | Yes | — | — | GitHub handle |
| `github_access_token` | `TEXT` | Yes | — | — | App-encrypted OAuth token |
| `role` | `UserRole` | No | `'developer'` | Enum (`developer`, `client`, `admin`) | Primary platform role |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | — | Soft-delete timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | — | Updated on edit | Last update timestamp |

---

## 2. `projects`

High-level project workspace connecting developers and clients.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `title` | `VARCHAR(255)` | No | — | — | Project title |
| `description` | `TEXT` | Yes | — | — | Extended project scope |
| `status` | `ProjectStatus` | No | `'draft'` | Enum (`draft`, `active`, `paused`, `completed`, `cancelled`) | Project lifecycle state |
| `budget_amount` | `DECIMAL(12,2)` | Yes | — | — | Total budget estimate |
| `budget_currency` | `VARCHAR(3)` | No | `'USD'` | — | ISO 4217 currency code |
| `client_id` | `UUID` | No | — | FK → `users(id)` ON DELETE RESTRICT | Paying client user |
| `owner_id` | `UUID` | No | — | FK → `users(id)` ON DELETE RESTRICT | Project lead / developer |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | — | Soft-delete timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | — | Updated on edit | Update timestamp |

---

## 3. `project_members`

Many-to-many relationship linking users to projects with granular roles.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `project_id` | `UUID` | No | — | FK → `projects(id)` ON DELETE CASCADE | Associated project |
| `user_id` | `UUID` | No | — | FK → `users(id)` ON DELETE CASCADE | Member user |
| `role` | `ProjectMemberRole` | No | — | Enum (`owner`, `developer`, `client`, `viewer`) | Role within this project |
| `added_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Join timestamp |

*Composite Unique:* `UNIQUE(project_id, user_id)`

---

## 4. `milestones`

Milestones tracking deliverables and payments.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `project_id` | `UUID` | No | — | FK → `projects(id)` ON DELETE CASCADE | Parent project |
| `title` | `VARCHAR(255)` | No | — | — | Milestone title |
| `description` | `TEXT` | Yes | — | — | Scope details |
| `position` | `INTEGER` | No | — | — | 1-based display ordering |
| `status` | `MilestoneStatus` | No | `'pending'` | Enum (`pending`, `in_progress`, `ai_reviewed`, `approved`, `invoiced`, `paid`, `rejected`) | Workflow status |
| `amount` | `DECIMAL(12,2)` | Yes | — | — | Financial disbursement amount |
| `currency` | `VARCHAR(3)` | No | `'USD'` | — | ISO 4217 currency code |
| `due_date` | `DATE` | Yes | — | — | Target completion date |
| `approved_by` | `UUID` | Yes | — | FK → `users(id)` ON DELETE RESTRICT | Human reviewer who approved |
| `approved_at` | `TIMESTAMPTZ` | Yes | — | — | Approval timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Yes | — | — | Soft-delete timestamp |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | — | Updated on edit | Update timestamp |

---

## 5. `acceptance_criteria`

Granular requirements required for milestone completion.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `milestone_id` | `UUID` | No | — | FK → `milestones(id)` ON DELETE CASCADE | Parent milestone |
| `description` | `TEXT` | No | — | — | Acceptance requirement description |
| `position` | `INTEGER` | No | — | — | Display position ordering |
| `is_met` | `BOOLEAN` | No | `false` | — | Requirement verified satisfied |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | — | Updated on edit | Update timestamp |

---

## 6. `github_repositories`

Connected GitHub source repositories for evidence extraction.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `project_id` | `UUID` | No | — | FK → `projects(id)` ON DELETE CASCADE | Associated project |
| `github_repo_id` | `BIGINT` | No | — | — | GitHub numeric repository ID |
| `owner` | `VARCHAR(255)` | No | — | — | Repository owner/organization |
| `name` | `VARCHAR(255)` | No | — | — | Repository slug |
| `full_name` | `VARCHAR(512)` | No | — | — | Full `owner/name` format |
| `default_branch` | `VARCHAR(255)` | No | `'main'` | — | Default git branch |
| `connected_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Connection timestamp |

*Composite Unique:* `UNIQUE(project_id, github_repo_id)`

---

## 7. `evidence`

Collected development artifacts (commits, PRs, issues) referenced by milestones.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `milestone_id` | `UUID` | No | — | FK → `milestones(id)` ON DELETE CASCADE | Target milestone |
| `github_repository_id` | `UUID` | Yes | — | FK → `github_repositories(id)` ON DELETE SET NULL | Source repo |
| `type` | `EvidenceType` | No | — | Enum (`commit`, `pull_request`, `issue`, `file_change`, `comment`, `other`) | Artifact kind |
| `external_id` | `VARCHAR(255)` | Yes | — | — | External reference (SHA, PR #) |
| `external_url` | `TEXT` | Yes | — | — | Direct link to GitHub |
| `title` | `VARCHAR(500)` | Yes | — | — | Title / commit message summary |
| `summary` | `TEXT` | Yes | — | — | Detailed summary |
| `raw_data` | `JSONB` | Yes | — | — | Full raw API response payload |
| `collected_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Fetch timestamp |

---

## 8. `ai_analyses`

AI milestone completion findings and explainable reports. **Advisory only.**

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `milestone_id` | `UUID` | No | — | FK → `milestones(id)` ON DELETE CASCADE | Target milestone |
| `overall_score` | `DECIMAL(5,2)` | Yes | — | — | Confidence score (0.00 – 100.00) |
| `summary` | `TEXT` | No | — | — | Natural-language summary |
| `findings` | `JSONB` | No | — | — | Structured criteria evaluation |
| `evidence_ids` | `UUID[]` | Yes | — | — | Referenced evidence array |
| `model_identifier` | `VARCHAR(255)` | Yes | — | — | Model ID / version used |
| `status` | `AiAnalysisStatus` | No | `'pending'` | Enum (`pending`, `completed`, `failed`) | Processing status |
| `requested_by` | `UUID` | Yes | — | FK → `users(id)` ON DELETE SET NULL | User who initiated analysis |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Analysis timestamp |

---

## 9. `milestone_approvals`

Human authorization records for milestone completion.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `milestone_id` | `UUID` | No | — | FK → `milestones(id)` ON DELETE RESTRICT | Approved milestone |
| `ai_analysis_id` | `UUID` | Yes | — | FK → `ai_analyses(id)` ON DELETE SET NULL | Analysis reviewed |
| `approved_by` | `UUID` | No | — | FK → `users(id)` ON DELETE RESTRICT | Human reviewer user ID |
| `decision` | `ApprovalDecision` | No | — | Enum (`approved`, `rejected`) | Final review decision |
| `comments` | `TEXT` | Yes | — | — | Review feedback |
| `decided_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Decision timestamp |

---

## 10. `invoices`

PayPal invoice records generated upon milestone approval.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `milestone_id` | `UUID` | No | — | FK → `milestones(id)` ON DELETE RESTRICT | Invoiced milestone |
| `project_id` | `UUID` | No | — | FK → `projects(id)` ON DELETE RESTRICT | Project context |
| `paypal_invoice_id` | `VARCHAR(255)` | Yes | — | UNIQUE | External PayPal Invoice ID |
| `paypal_invoice_url` | `TEXT` | Yes | — | — | Payer web checkout URL |
| `status` | `InvoiceStatus` | No | `'draft'` | Enum (`draft`, `sent`, `paid`, `cancelled`, `refunded`, `error`) | Invoice state |
| `amount` | `DECIMAL(12,2)` | No | — | — | Invoiced monetary total |
| `currency` | `VARCHAR(3)` | No | `'USD'` | — | ISO 4217 currency code |
| `recipient_email` | `VARCHAR(255)` | No | — | — | Client payer email |
| `sent_at` | `TIMESTAMPTZ` | Yes | — | — | Dispatch timestamp |
| `paid_at` | `TIMESTAMPTZ` | Yes | — | — | Payment settlement timestamp |
| `created_by` | `UUID` | No | — | FK → `users(id)` ON DELETE RESTRICT | Authorizing user ID |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | — | Updated on edit | Update timestamp |

---

## 11. `payments`

Settled financial transactions populated strictly through verified webhooks.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `invoice_id` | `UUID` | No | — | FK → `invoices(id)` ON DELETE RESTRICT | Parent invoice |
| `paypal_payment_id` | `VARCHAR(255)` | No | — | UNIQUE | PayPal transaction / capture ID |
| `paypal_payer_id` | `VARCHAR(255)` | Yes | — | — | PayPal account payer ID |
| `amount` | `DECIMAL(12,2)` | No | — | — | Settled amount |
| `currency` | `VARCHAR(3)` | No | — | — | Currency code |
| `status` | `PaymentStatus` | No | — | Enum (`completed`, `pending`, `failed`, `refunded`) | Transaction state |
| `paid_at` | `TIMESTAMPTZ` | No | — | — | Payment settlement time |
| `raw_webhook_data` | `JSONB` | Yes | — | — | Sanitized webhook payload |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Insertion timestamp |

---

## 12. `webhook_events`

Idempotent audit log for all inbound PayPal and GitHub webhooks.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `source` | `WebhookSource` | No | — | Enum (`paypal`, `github`) | Event originator |
| `event_id` | `VARCHAR(255)` | No | — | — | External event UUID / ID |
| `event_type` | `VARCHAR(255)` | No | — | — | Event name (e.g., `INVOICING.INVOICE.PAID`) |
| `payload` | `JSONB` | No | — | — | Raw parsed payload |
| `status` | `WebhookEventStatus` | No | `'received'` | Enum (`received`, `processing`, `processed`, `failed`) | Processing state |
| `processed_at` | `TIMESTAMPTZ` | Yes | — | — | Execution timestamp |
| `error_message` | `TEXT` | Yes | — | — | Diagnostic error details if failed |
| `received_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Ingress timestamp |

*Composite Unique:* `UNIQUE(source, event_id)` — **Enforces strict idempotency**

---

## 13. `notifications`

In-app alerts for users concerning milestone updates and payment events.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `user_id` | `UUID` | No | — | FK → `users(id)` ON DELETE CASCADE | Recipient user |
| `type` | `VARCHAR(100)` | No | — | — | Notification classification |
| `title` | `VARCHAR(255)` | No | — | — | Display headline |
| `message` | `TEXT` | Yes | — | — | Notification content |
| `reference_type` | `VARCHAR(50)` | Yes | — | — | Linked entity type (`milestone`, `invoice`) |
| `reference_id` | `UUID` | Yes | — | — | Linked entity identifier |
| `is_read` | `BOOLEAN` | No | `false` | — | Read acknowledgment |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Event timestamp |

---

## 14. `audit_logs`

Immutable security audit trail for all business and financial operations.

| Column | Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `id` | `UUID` | No | — | PK | Primary identifier |
| `user_id` | `UUID` | Yes | — | FK → `users(id)` ON DELETE SET NULL | Acting user (`NULL` for automated events) |
| `action` | `VARCHAR(100)` | No | — | — | Action name (e.g., `milestone.approved`) |
| `entity_type` | `VARCHAR(50)` | No | — | — | Target entity name |
| `entity_id` | `UUID` | No | — | — | Target record UUID |
| `old_values` | `JSONB` | Yes | — | — | Pre-action state diff |
| `new_values` | `JSONB` | Yes | — | — | Post-action state diff |
| `ip_address` | `VARCHAR(45)` | Yes | — | — | Originating client IP |
| `user_agent` | `TEXT` | Yes | — | — | Client user-agent string |
| `created_at` | `TIMESTAMPTZ` | No | `CURRENT_TIMESTAMP` | — | Inscription timestamp |
