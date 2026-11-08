# DevFlow – Entity Relationship Documentation

## Entity Overview

DevFlow's database consists of **14 entities** organised into four domains:

### Core Domain
- **users** — Platform accounts (GitHub OAuth)
- **projects** — Development projects connecting developers and clients
- **project_members** — Many-to-many membership with per-project roles

### Milestone Domain
- **milestones** — Project deliverables with payment amounts
- **acceptance_criteria** — Testable requirements per milestone
- **evidence** — Development evidence from GitHub (commits, PRs, issues)
- **ai_analyses** — AI-generated milestone completion assessments (advisory only)
- **milestone_approvals** — Human approval/rejection decisions

### Financial Domain
- **invoices** — PayPal invoice records
- **payments** — Confirmed payments (webhook-only writes)
- **webhook_events** — Idempotent webhook event log

### Platform Domain
- **github_repositories** — Linked GitHub repositories per project
- **notifications** — User notifications
- **audit_logs** — Immutable action audit trail

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CORE DOMAIN                                     │
│                                                                              │
│  ┌──────────┐   owns    ┌──────────┐  has members  ┌─────────────────┐      │
│  │  users   │──────────▶│ projects │──────────────▶│ project_members │      │
│  │          │   pays    │          │               │                 │      │
│  │          │──────────▶│          │               │                 │      │
│  │          │◀──────────│          │               │  user_id ──────▶│users │
│  └──────────┘           └──────────┘               └─────────────────┘      │
│       │                      │                                               │
│       │                      │ linked to                                     │
│       │                      ▼                                               │
│       │               ┌──────────────────┐                                   │
│       │               │github_repositories│                                  │
│       │               └──────────────────┘                                   │
│       │                      │                                               │
└───────│──────────────────────│───────────────────────────────────────────────┘
        │                      │
┌───────│──────────────────────│───────────────────────────────────────────────┐
│       │              MILESTONE DOMAIN                                        │
│       │                      │                                               │
│       │  ┌──────────┐  contains  ┌────────────┐  defines  ┌──────────────┐  │
│       │  │ projects │──────────▶│ milestones  │─────────▶│ acceptance   │  │
│       │  └──────────┘           │             │          │ _criteria    │  │
│       │                         │             │          └──────────────┘  │
│       │                         │             │                            │
│       │                         │  supported  │  analysed by               │
│       │                         │     by      │                            │
│       │                         │    ▼        │    ▼                       │
│       │                   ┌──────────┐  ┌──────────────┐                   │
│       │                   │ evidence │  │ ai_analyses  │                   │
│       │                   │          │  │ (ADVISORY)   │                   │
│       │                   │ repo ────▶github_repos     │                   │
│       │                   └──────────┘  └──────┬───────┘                   │
│       │                                        │                           │
│       │  approved by                  reviewed in                          │
│       ▼          ▼                        ▼                                │
│  ┌──────────────────────┐                                                  │
│  │ milestone_approvals  │  approved_by → users (NOT NULL — human only)     │
│  └──────────────────────┘                                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          FINANCIAL DOMAIN                                    │
│                                                                              │
│  ┌────────────┐  invoiced for  ┌──────────┐  paid through  ┌──────────┐    │
│  │ milestones │──────────────▶│ invoices  │──────────────▶│ payments │    │
│  └────────────┘               │           │               │ (webhook │    │
│                               │created_by │               │  only)   │    │
│                               │ → users   │               └──────────┘    │
│                               └──────────┘                                 │
│                                    ▲                                        │
│                        updates via │                                        │
│                               ┌──────────────┐                              │
│                               │webhook_events │                             │
│                               │UNIQUE(source, │                             │
│                               │ event_id)     │                             │
│                               └──────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM DOMAIN                                     │
│                                                                              │
│  ┌──────────┐  receives  ┌───────────────┐                                  │
│  │  users   │──────────▶│ notifications │                                  │
│  │          │           └───────────────┘                                  │
│  │          │  performs                                                     │
│  │          │──────────▶┌────────────┐                                     │
│  └──────────┘           │ audit_logs │  (INSERT-only, immutable)           │
│                          └────────────┘                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Foreign Key Summary

| Parent Table | Child Table | FK Column | ON DELETE |
|---|---|---|---|
| `users` | `projects` | `owner_id` | RESTRICT |
| `users` | `projects` | `client_id` | RESTRICT |
| `users` | `project_members` | `user_id` | CASCADE |
| `projects` | `project_members` | `project_id` | CASCADE |
| `projects` | `milestones` | `project_id` | CASCADE |
| `users` | `milestones` | `approved_by` | RESTRICT |
| `milestones` | `acceptance_criteria` | `milestone_id` | CASCADE |
| `projects` | `github_repositories` | `project_id` | CASCADE |
| `milestones` | `evidence` | `milestone_id` | CASCADE |
| `github_repositories` | `evidence` | `github_repository_id` | SET NULL |
| `milestones` | `ai_analyses` | `milestone_id` | CASCADE |
| `users` | `ai_analyses` | `requested_by` | SET NULL |
| `milestones` | `milestone_approvals` | `milestone_id` | RESTRICT |
| `ai_analyses` | `milestone_approvals` | `ai_analysis_id` | SET NULL |
| `users` | `milestone_approvals` | `approved_by` | RESTRICT |
| `milestones` | `invoices` | `milestone_id` | RESTRICT |
| `projects` | `invoices` | `project_id` | RESTRICT |
| `users` | `invoices` | `created_by` | RESTRICT |
| `invoices` | `payments` | `invoice_id` | RESTRICT |
| `users` | `notifications` | `user_id` | CASCADE |
| `users` | `audit_logs` | `user_id` | SET NULL |

### ON DELETE Strategy

- **CASCADE** — Child records are automatically deleted (draft/in-progress data)
- **RESTRICT** — Deletion blocked if child records exist (financial/approval data)
- **SET NULL** — FK set to null, child record preserved (audit/evidence trail)

## Soft Delete Entities

The following entities use soft deletes (`deleted_at` column) instead of hard deletes:

| Entity | Reason |
|---|---|
| `users` | Preserve audit trail, references from invoices and approvals |
| `projects` | Preserve financial history and milestone records |
| `milestones` | Preserve approval and payment history |

Application queries must filter `WHERE deleted_at IS NULL` for these entities.
