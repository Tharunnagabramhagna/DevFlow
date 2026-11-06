# DevFlow – From Code to Cash

**AI-Powered Milestone Intelligence & Payment Orchestration Platform**

DevFlow is an AI-powered platform designed to connect software development progress with financial workflows. It helps freelancers, developers and digital agencies track project milestones, analyse development evidence through AI, generate payment invoices and monitor transactions through PayPal.

## The Problem

Software freelancers and development teams often spend significant time manually tracking project progress, collecting evidence of completed work, communicating with clients and managing milestone-based payments.

DevFlow aims to simplify this process through intelligent automation.

## Our Solution

DevFlow connects GitHub development activity, AI-powered milestone analysis and PayPal payment workflows into one platform.

### Core Features

- **AI Agreement Parsing:** Convert project briefs into structured milestones and requirements.
- **GitHub Integration:** Retrieve commits, pull requests, issues and development evidence.
- **AI Milestone Analysis:** Evaluate collected evidence against project requirements.
- **Evidence Intelligence:** Identify completed requirements, missing evidence and potential blockers.
- **Human-in-the-Loop Approval:** Allow developers and clients to review milestone completion before financial actions.
- **PayPal Invoicing:** Generate and send milestone-based invoices through PayPal.
- **Payment Verification:** Track payment events using verified PayPal webhooks.
- **Project Dashboard:** Monitor milestones, invoices and project progress.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| AI Service | Python, FastAPI |
| AI/LLM | LLMs, Embeddings, Semantic Retrieval |
| Database | PostgreSQL, Prisma |
| Development Integration | GitHub REST API |
| Payments | PayPal Invoicing API, Webhooks |
| Testing | Vitest, Pytest |

## System Architecture

1. Users create projects and define milestones.
2. GitHub integration retrieves relevant development evidence.
3. The AI service analyses the evidence against project requirements.
4. The system generates an explainable milestone report.
5. Developers and clients review and approve the milestone.
6. The backend creates a PayPal invoice.
7. PayPal processes the payment.
8. Verified webhook events synchronize payment status.

## Project Structure

- `frontend/` – React application.
- `backend/` – Node.js API and business logic.
- `ai-service/` – AI agents, retrieval and milestone analysis.
- `database/` – Database schema and migrations.
- `docs/` – Architecture and integration documentation.
- `tests/` – Automated tests.

## Getting Started

Prerequisites:
- Node.js
- Python
- PostgreSQL
- Git
- PayPal Developer account
- GitHub account
- LLM API credentials

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/DevFlow.git
cd DevFlow
```

Install dependencies and configure the individual services using their respective setup instructions.

Create environment files from `.env.example` and configure your database, GitHub OAuth and PayPal sandbox credentials.

**Never commit API keys, access tokens or other secrets.**

## Payment Security

- PayPal credentials remain server-side.
- Webhook signatures must be verified.
- Payment status is updated only after verified events.
- Duplicate webhook events are handled idempotently.
- Financial actions require appropriate human approval.

## Current Development Status

DevFlow is under active development as a hackathon project.

Features and integrations will be updated as implementation progresses.

## Team

Built collaboratively by the DevFlow team.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
