# DevFlow Database

Database schema, migrations, and seed data for the DevFlow platform.

## Technology

- **PostgreSQL 16** (Docker)
- **Prisma ORM** (schema, migrations, generated client)

## Quick Start

### Prerequisites

- Docker Compose running (`docker compose up -d` from project root)
- Node.js installed
- npm packages installed (`npm install` from project root)

### Commands

Run all commands from the **project root** directory:

```bash
# Generate Prisma client (after schema changes)
npx prisma generate --schema database/prisma/schema.prisma

# Create and apply a new migration
npx prisma migrate dev --schema database/prisma/schema.prisma --name descriptive_name

# Apply pending migrations (production)
npx prisma migrate deploy --schema database/prisma/schema.prisma

# Seed the database with development data
npx prisma db seed --schema database/prisma/schema.prisma

# Reset the database (drop + migrate + seed)
npx prisma migrate reset --schema database/prisma/schema.prisma

# Open Prisma Studio (visual data browser)
npx prisma studio --schema database/prisma/schema.prisma
# Validate and test database (integrity, constraints, security)
npx tsx database/prisma/validate.ts
```

Or use the convenience scripts:

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Create migration
npm run db:seed        # Seed database (idempotent)
npm run db:reset       # Full reset
npm run db:studio      # Open Prisma Studio
npm run db:test        # Run 35 automated database validation tests
```

## Structure

```
database/
├── prisma/
│   ├── schema.prisma       # Database schema (models, enums, relations)
│   ├── seed.ts             # Development seed data (idempotent)
│   ├── validate.ts         # Non-destructive automated validation tests
│   └── migrations/         # Auto-generated SQL migrations
├── docs/                   # Detailed documentation
│   ├── data-dictionary.md  # Comprehensive table & column specifications
│   ├── entity-relationship.md # ER diagrams & relationship flows
│   └── security-rules.md   # DB-level & application security boundaries
├── seeds/                  # Additional seed data scripts
└── README.md               # This file
```

## Entities

| Entity | Description |
|---|---|
| `users` | User accounts (GitHub OAuth) |
| `projects` | Development projects |
| `project_members` | Project membership and roles |
| `milestones` | Project milestones with payment amounts |
| `acceptance_criteria` | Requirements for each milestone |
| `github_repositories` | Linked GitHub repositories |
| `evidence` | Development evidence (commits, PRs, issues) |
| `ai_analyses` | AI milestone analysis results (advisory only) |
| `milestone_approvals` | Human approval decisions |
| `invoices` | PayPal invoice records |
| `payments` | Confirmed payment records (webhook-only) |
| `webhook_events` | Idempotent webhook event log |
| `notifications` | User notifications |
| `audit_logs` | Audit trail for all actions |

## Security Rules

- AI analyses are advisory — **milestones require human approval**
- Payment records are created **only from verified PayPal webhooks**
- Webhook processing is **idempotent** (unique constraint on event ID)
- No payment credentials stored — only transaction identifiers
- `github_access_token` must be **encrypted at the application level**
- `.env` files must **never** be committed to Git
