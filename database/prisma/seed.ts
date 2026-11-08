// =============================================================================
// DevFlow – Database Seed Script (Idempotent)
// =============================================================================
//
// Populates the development database with realistic sample data.
// This script is fully idempotent — safe to run multiple times.
// It uses deterministic UUIDs and upsert/skipDuplicates throughout.
//
// Run from project root:
//   npx prisma db seed --schema database/prisma/schema.prisma
//
// Or via the convenience script:
//   npm run db:seed
// =============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic seed IDs — fixed UUIDs for repeatable, idempotent seeding.
// ---------------------------------------------------------------------------
const IDS = {
  developer:   "11111111-aaaa-4000-8000-000000000001",
  client:      "11111111-aaaa-4000-8000-000000000002",
  project:     "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  milestone1:  "22222222-bbbb-4000-8000-000000000001",
  milestone2:  "22222222-bbbb-4000-8000-000000000002",
  milestone3:  "22222222-bbbb-4000-8000-000000000003",
  repo:        "33333333-cccc-4000-8000-000000000001",
  evidence1:   "44444444-dddd-4000-8000-000000000001",
  evidence2:   "44444444-dddd-4000-8000-000000000002",
  analysis1:   "55555555-eeee-4000-8000-000000000001",
  approval1:   "66666666-ffff-4000-8000-000000000001",
  invoice1:    "77777777-aaaa-4000-8000-000000000001",
  payment1:    "88888888-bbbb-4000-8000-000000000001",
  webhook1:    "99999999-cccc-4000-8000-000000000001",
} as const;

async function main() {
  console.log("🌱 Seeding DevFlow database...\n");

  // =========================================================================
  // 1. Users
  // =========================================================================
  const developer = await prisma.user.upsert({
    where: { email: "alex.developer@example.com" },
    update: {},
    create: {
      id: IDS.developer,
      email: "alex.developer@example.com",
      name: "Alex Rivera",
      role: "developer",
      githubId: "12345678",
      githubUsername: "alex-rivera-dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345678",
    },
  });
  console.log(`  ✅ User: ${developer.name} (${developer.role})`);

  const client = await prisma.user.upsert({
    where: { email: "jordan.client@example.com" },
    update: {},
    create: {
      id: IDS.client,
      email: "jordan.client@example.com",
      name: "Jordan Chen",
      role: "client",
      githubId: "87654321",
      githubUsername: "jordan-chen",
      avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
    },
  });
  console.log(`  ✅ User: ${client.name} (${client.role})`);

  // =========================================================================
  // 2. Project
  // =========================================================================
  const project = await prisma.project.upsert({
    where: { id: IDS.project },
    update: {},
    create: {
      id: IDS.project,
      title: "E-Commerce Platform Redesign",
      description:
        "Complete redesign of the client's e-commerce platform with modern UI, improved checkout flow, and mobile responsiveness.",
      status: "active",
      budgetAmount: 15000.0,
      budgetCurrency: "USD",
      ownerId: developer.id,
      clientId: client.id,
    },
  });
  console.log(`  ✅ Project: ${project.title}`);

  // =========================================================================
  // 3. Project Members
  // =========================================================================
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: developer.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: developer.id,
      role: "owner",
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: client.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: client.id,
      role: "client",
    },
  });
  console.log("  ✅ Project members assigned");

  // =========================================================================
  // 4. Milestones with Acceptance Criteria
  // =========================================================================

  // Helper: upsert milestone, then ensure its acceptance criteria exist
  async function upsertMilestone(
    id: string,
    data: Parameters<typeof prisma.milestone.upsert>[0]["create"],
    criteria: { description: string; position: number; isMet: boolean }[]
  ) {
    const milestone = await prisma.milestone.upsert({
      where: { id },
      update: {},
      create: { ...data, id },
    });

    // Upsert acceptance criteria (no natural unique key, so check by milestone + position)
    for (const c of criteria) {
      const existing = await prisma.acceptanceCriterion.findFirst({
        where: { milestoneId: id, position: c.position },
      });
      if (!existing) {
        await prisma.acceptanceCriterion.create({
          data: {
            milestoneId: id,
            description: c.description,
            position: c.position,
            isMet: c.isMet,
          },
        });
      }
    }

    return milestone;
  }

  const milestone1 = await upsertMilestone(
    IDS.milestone1,
    {
      projectId: project.id,
      title: "Frontend Foundation & Design System",
      description:
        "Set up the React project, implement the design system components, and create the responsive layout framework.",
      position: 1,
      status: "approved",
      amount: 4000.0,
      currency: "USD",
      dueDate: new Date("2026-11-15"),
      approvedBy: client.id,
      approvedAt: new Date("2026-11-05T14:30:00Z"),
    },
    [
      { description: "React project initialized with TypeScript, Vite, and Tailwind CSS", position: 1, isMet: true },
      { description: "Design system with reusable Button, Card, Input, and Modal components", position: 2, isMet: true },
      { description: "Responsive layout with header, sidebar, and main content area", position: 3, isMet: true },
    ]
  );
  console.log(`  ✅ Milestone 1: ${milestone1.title} (${milestone1.status})`);

  const milestone2 = await upsertMilestone(
    IDS.milestone2,
    {
      projectId: project.id,
      title: "Product Catalog & Search",
      description:
        "Implement the product listing pages, search functionality, filtering, and product detail views.",
      position: 2,
      status: "ai_reviewed",
      amount: 5000.0,
      currency: "USD",
      dueDate: new Date("2026-11-30"),
    },
    [
      { description: "Product listing page with grid/list view toggle and pagination", position: 1, isMet: true },
      { description: "Search with autocomplete and category filtering", position: 2, isMet: true },
      { description: "Product detail page with image gallery, reviews, and add-to-cart", position: 3, isMet: false },
    ]
  );
  console.log(`  ✅ Milestone 2: ${milestone2.title} (${milestone2.status})`);

  const milestone3 = await upsertMilestone(
    IDS.milestone3,
    {
      projectId: project.id,
      title: "Checkout & Payment Integration",
      description:
        "Build the shopping cart, checkout flow, and integrate PayPal payment processing.",
      position: 3,
      status: "pending",
      amount: 6000.0,
      currency: "USD",
      dueDate: new Date("2026-12-15"),
    },
    [
      { description: "Shopping cart with add, remove, and quantity controls", position: 1, isMet: false },
      { description: "Multi-step checkout with shipping address and order review", position: 2, isMet: false },
      { description: "PayPal payment integration with order confirmation", position: 3, isMet: false },
    ]
  );
  console.log(`  ✅ Milestone 3: ${milestone3.title} (${milestone3.status})`);

  // =========================================================================
  // 5. GitHub Repository
  // =========================================================================
  const repo = await prisma.githubRepository.upsert({
    where: { id: IDS.repo },
    update: {},
    create: {
      id: IDS.repo,
      projectId: project.id,
      githubRepoId: 123456789,
      owner: "alex-rivera-dev",
      name: "ecommerce-redesign",
      fullName: "alex-rivera-dev/ecommerce-redesign",
      defaultBranch: "main",
    },
  });
  console.log(`  ✅ GitHub repo linked: ${repo.fullName}`);

  // =========================================================================
  // 6. Evidence (for milestone 1)
  // =========================================================================
  await prisma.evidence.upsert({
    where: { id: IDS.evidence1 },
    update: {},
    create: {
      id: IDS.evidence1,
      milestoneId: milestone1.id,
      githubRepositoryId: repo.id,
      type: "pull_request",
      externalId: "PR-12",
      externalUrl:
        "https://github.com/alex-rivera-dev/ecommerce-redesign/pull/12",
      title: "feat: implement design system components",
      summary:
        "Added Button, Card, Input, and Modal components with Storybook documentation and unit tests.",
      rawData: {
        number: 12,
        state: "merged",
        additions: 1247,
        deletions: 23,
        changed_files: 18,
      },
    },
  });

  await prisma.evidence.upsert({
    where: { id: IDS.evidence2 },
    update: {},
    create: {
      id: IDS.evidence2,
      milestoneId: milestone1.id,
      githubRepositoryId: repo.id,
      type: "commit",
      externalId: "abc123def456",
      externalUrl:
        "https://github.com/alex-rivera-dev/ecommerce-redesign/commit/abc123def456",
      title: "feat: responsive layout with sidebar navigation",
      summary:
        "Implemented responsive layout system with collapsible sidebar, sticky header, and mobile hamburger menu.",
    },
  });
  console.log("  ✅ Evidence records created for milestone 1");

  // =========================================================================
  // 7. AI Analysis (for milestone 1)
  // =========================================================================
  await prisma.aiAnalysis.upsert({
    where: { id: IDS.analysis1 },
    update: {},
    create: {
      id: IDS.analysis1,
      milestoneId: milestone1.id,
      overallScore: 95.5,
      summary:
        "Strong evidence of milestone completion. All three acceptance criteria are well-supported by the submitted pull request and commit history. The design system components are documented and tested. Minor note: accessibility attributes could be more comprehensive.",
      findings: {
        criteria: [
          {
            criterionIndex: 1,
            status: "met",
            confidence: 0.98,
            evidence: ["PR-12 shows Vite + TypeScript + Tailwind setup"],
          },
          {
            criterionIndex: 2,
            status: "met",
            confidence: 0.95,
            evidence: [
              "PR-12 includes Button, Card, Input, Modal components with tests",
            ],
          },
          {
            criterionIndex: 3,
            status: "met",
            confidence: 0.93,
            evidence: [
              "Commit abc123def456 implements responsive layout with sidebar",
            ],
          },
        ],
        overallAssessment:
          "Milestone requirements are substantially met with strong evidence.",
      },
      evidenceIds: [IDS.evidence1],
      modelIdentifier: "gemini-2.5-pro",
      status: "completed",
      requestedBy: developer.id,
    },
  });
  console.log("  ✅ AI analysis created for milestone 1");

  // =========================================================================
  // 8. Milestone Approval (for milestone 1 — human approval)
  // =========================================================================
  await prisma.milestoneApproval.upsert({
    where: { id: IDS.approval1 },
    update: {},
    create: {
      id: IDS.approval1,
      milestoneId: milestone1.id,
      aiAnalysisId: IDS.analysis1,
      approvedBy: client.id,
      decision: "approved",
      comments:
        "Looks great! The design system is clean and well-documented. Approved for invoicing.",
    },
  });
  console.log("  ✅ Milestone 1 approved by client");

  // =========================================================================
  // 9. Invoice (for milestone 1)
  // =========================================================================
  await prisma.invoice.upsert({
    where: { id: IDS.invoice1 },
    update: {},
    create: {
      id: IDS.invoice1,
      milestoneId: milestone1.id,
      projectId: project.id,
      paypalInvoiceId: "INV2-XXXX-XXXX-XXXX-SEED",
      paypalInvoiceUrl:
        "https://www.sandbox.paypal.com/invoice/p/#INV2-XXXX-XXXX-XXXX-SEED",
      status: "paid",
      amount: 4000.0,
      currency: "USD",
      recipientEmail: "jordan.client@example.com",
      sentAt: new Date("2026-11-05T15:00:00Z"),
      paidAt: new Date("2026-11-06T10:15:00Z"),
      createdBy: developer.id,
    },
  });
  console.log("  ✅ Invoice created: INV2-XXXX-XXXX-XXXX-SEED");

  // =========================================================================
  // 10. Payment (from verified webhook)
  // =========================================================================
  await prisma.payment.upsert({
    where: { id: IDS.payment1 },
    update: {},
    create: {
      id: IDS.payment1,
      invoiceId: IDS.invoice1,
      paypalPaymentId: "PAY-SEED-1234567890",
      paypalPayerId: "PAYER-SEED-ABC",
      amount: 4000.0,
      currency: "USD",
      status: "completed",
      paidAt: new Date("2026-11-06T10:15:00Z"),
      rawWebhookData: {
        event_type: "INVOICING.INVOICE.PAID",
        resource: {
          invoice_id: "INV2-XXXX-XXXX-XXXX-SEED",
          status: "PAID",
        },
      },
    },
  });
  console.log("  ✅ Payment record created");

  // =========================================================================
  // 11. Webhook Event (the PayPal webhook that confirmed payment)
  // =========================================================================
  await prisma.webhookEvent.upsert({
    where: { id: IDS.webhook1 },
    update: {},
    create: {
      id: IDS.webhook1,
      source: "paypal",
      eventId: "WH-SEED-EVENT-001",
      eventType: "INVOICING.INVOICE.PAID",
      payload: {
        id: "WH-SEED-EVENT-001",
        event_type: "INVOICING.INVOICE.PAID",
        resource: {
          id: "INV2-XXXX-XXXX-XXXX-SEED",
          status: "PAID",
          amount: { currency_code: "USD", value: "4000.00" },
        },
      },
      status: "processed",
      processedAt: new Date("2026-11-06T10:15:01Z"),
    },
  });
  console.log("  ✅ Webhook event recorded");

  // =========================================================================
  // 12. Notifications (use skipDuplicates — no natural unique key)
  // =========================================================================
  // Delete and re-create seed notifications to stay idempotent
  await prisma.notification.deleteMany({
    where: {
      type: { in: ["payment_received", "milestone_submitted"] },
      userId: { in: [developer.id, client.id] },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: developer.id,
        type: "payment_received",
        title: "Payment Received",
        message:
          'Payment of $4,000.00 received for milestone "Frontend Foundation & Design System".',
        referenceType: "invoice",
        referenceId: IDS.invoice1,
        isRead: true,
      },
      {
        userId: client.id,
        type: "milestone_submitted",
        title: "Milestone Ready for Review",
        message:
          '"Product Catalog & Search" has been submitted for AI analysis and your review.',
        referenceType: "milestone",
        referenceId: milestone2.id,
        isRead: false,
      },
    ],
  });
  console.log("  ✅ Notifications created");

  // =========================================================================
  // 13. Audit Logs (use delete + recreate for seed logs)
  // =========================================================================
  await prisma.auditLog.deleteMany({
    where: {
      action: { in: ["project.created", "milestone.approved", "invoice.created", "payment.confirmed"] },
      entityId: { in: [project.id, milestone1.id, IDS.invoice1] },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: developer.id,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
        newValues: { title: project.title, status: "active" },
      },
      {
        userId: client.id,
        action: "milestone.approved",
        entityType: "milestone",
        entityId: milestone1.id,
        oldValues: { status: "ai_reviewed" },
        newValues: { status: "approved" },
      },
      {
        userId: developer.id,
        action: "invoice.created",
        entityType: "invoice",
        entityId: IDS.invoice1,
        newValues: {
          paypalInvoiceId: "INV2-XXXX-XXXX-XXXX-SEED",
          amount: 4000.0,
        },
      },
      {
        userId: null,
        action: "payment.confirmed",
        entityType: "payment",
        entityId: IDS.invoice1,
        newValues: {
          status: "completed",
          source: "paypal_webhook",
          eventId: "WH-SEED-EVENT-001",
        },
      },
    ],
  });
  console.log("  ✅ Audit log entries created");

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n🎉 Seeding complete!\n");
  console.log("  Summary:");
  console.log("  ├── 2 users (developer + client)");
  console.log("  ├── 1 project");
  console.log("  ├── 2 project members");
  console.log("  ├── 3 milestones with 9 acceptance criteria");
  console.log("  ├── 1 GitHub repository");
  console.log("  ├── 2 evidence records");
  console.log("  ├── 1 AI analysis");
  console.log("  ├── 1 milestone approval");
  console.log("  ├── 1 invoice");
  console.log("  ├── 1 payment");
  console.log("  ├── 1 webhook event");
  console.log("  ├── 2 notifications");
  console.log("  └── 4 audit log entries");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
