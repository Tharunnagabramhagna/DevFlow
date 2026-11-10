// =============================================================================
// DevFlow – Database Seed Script (Idempotent)
// =============================================================================
// Populates the development database with realistic DevFlow domain records
// matching the authoritative schema in database/prisma/schema.prisma.
//
// Safe to run repeatedly — uses deterministic IDs and upserts throughout.
//
// Run from project root:
//   npm run db:seed
// =============================================================================

import {
  PrismaClient,
  Role,
  ProjectStatus,
  ProjectMemberRole,
  ProjectInvitationRole,
  InvitationStatus,
  MilestoneStatus,
  VerificationStatus,
  EvidenceType,
  PaymentStatus,
  PaymentPayoutStatus,
  CaptureStatus,
  CaptureFeeStatus,
  PayoutProvider,
  PayoutRecordStatus,
  NotificationType,
  ActivityAction,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic UUIDs for development seed data
export const SEED_IDS = {
  developer: "11111111-aaaa-4000-8000-000000000001",
  client: "11111111-aaaa-4000-8000-000000000002",
  admin: "11111111-aaaa-4000-8000-000000000003",
  project: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  invitation: "bbbbbbbb-1111-4000-8000-000000000001",
  milestone1: "22222222-bbbb-4000-8000-000000000001",
  milestone2: "22222222-bbbb-4000-8000-000000000002",
  milestone3: "22222222-bbbb-4000-8000-000000000003",
  evidence1: "44444444-dddd-4000-8000-000000000001",
  evidence2: "44444444-dddd-4000-8000-000000000002",
  verificationResult1: "55555555-aaaa-4000-8000-000000000001",
  aiAnalysis1: "55555555-eeee-4000-8000-000000000001",
  approval1: "66666666-ffff-4000-8000-000000000001",
  payment1: "77777777-aaaa-4000-8000-000000000001",
  capture1: "88888888-aaaa-4000-8000-000000000001",
  payout1: "88888888-bbbb-4000-8000-000000000001",
  webhook1: "99999999-cccc-4000-8000-000000000001",
  notif1: "aaaaaaaa-1111-4000-8000-000000000001",
  notif2: "aaaaaaaa-2222-4000-8000-000000000002",
  activity1: "bbbbbbbb-1111-4000-8000-000000000001",
  activity2: "bbbbbbbb-2222-4000-8000-000000000002",
  activity3: "bbbbbbbb-3333-4000-8000-000000000003",
} as const;

async function main() {
  console.log("🌱 Seeding DevFlow database with integrated schema...\n");

  // =========================================================================
  // 1. Users (Freelancer, Client, Admin)
  // =========================================================================
  const developer = await prisma.user.upsert({
    where: { email: "alex.developer@example.com" },
    update: {
      name: "Alex Rivera",
      role: Role.FREELANCER,
      githubId: "12345678",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345678",
    },
    create: {
      id: SEED_IDS.developer,
      email: "alex.developer@example.com",
      name: "Alex Rivera",
      role: Role.FREELANCER,
      githubId: "12345678",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345678",
      bio: "Senior Full-Stack TypeScript & AI Integrations Engineer",
    },
  });
  console.log(`  ✅ User (Freelancer): ${developer.name} (${developer.email})`);

  const client = await prisma.user.upsert({
    where: { email: "jordan.client@example.com" },
    update: {
      name: "Jordan Chen",
      role: Role.CLIENT,
      githubId: "87654321",
      avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
    },
    create: {
      id: SEED_IDS.client,
      email: "jordan.client@example.com",
      name: "Jordan Chen",
      role: Role.CLIENT,
      githubId: "87654321",
      avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
      bio: "Product Owner at RetailNext Labs",
    },
  });
  console.log(`  ✅ User (Client): ${client.name} (${client.email})`);

  const admin = await prisma.user.upsert({
    where: { email: "admin@devflow.example.com" },
    update: {
      name: "DevFlow System Admin",
      role: Role.ADMIN,
    },
    create: {
      id: SEED_IDS.admin,
      email: "admin@devflow.example.com",
      name: "DevFlow System Admin",
      role: Role.ADMIN,
      bio: "Platform Administrator & Financial Approver",
    },
  });
  console.log(`  ✅ User (Admin): ${admin.name} (${admin.email})`);

  // =========================================================================
  // 2. Project
  // =========================================================================
  const project = await prisma.project.upsert({
    where: { id: SEED_IDS.project },
    update: {
      title: "E-Commerce Platform Redesign",
      status: ProjectStatus.ACTIVE,
      budget: new Prisma.Decimal("15000.00"),
    },
    create: {
      id: SEED_IDS.project,
      title: "E-Commerce Platform Redesign",
      description:
        "Modernize client e-commerce infrastructure with PayPal integration, AI verification, and responsive UX.",
      brief:
        "Deliver verified milestones: Frontend foundation, Product catalog search, and Checkout payment pipeline.",
      budget: new Prisma.Decimal("15000.00"),
      currency: "USD",
      status: ProjectStatus.ACTIVE,
      createdById: developer.id,
      clientId: client.id,
      leadDeveloperId: developer.id,
      githubRepoOwner: "alex-rivera-dev",
      githubRepoName: "ecommerce-redesign",
      isArchived: false,
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
    update: { role: ProjectMemberRole.OWNER },
    create: {
      projectId: project.id,
      userId: developer.id,
      role: ProjectMemberRole.OWNER,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: client.id,
      },
    },
    update: { role: ProjectMemberRole.CLIENT },
    create: {
      projectId: project.id,
      userId: client.id,
      role: ProjectMemberRole.CLIENT,
    },
  });
  console.log("  ✅ Project members assigned");

  // =========================================================================
  // 4. Project Invitation (Pending)
  // =========================================================================
  const invitation = await prisma.projectInvitation.upsert({
    where: { tokenHash: "seed_invitation_token_hash_001" },
    update: { status: InvitationStatus.PENDING },
    create: {
      id: SEED_IDS.invitation,
      projectId: project.id,
      invitedById: developer.id,
      email: "qa.engineer@example.com",
      role: ProjectInvitationRole.MEMBER,
      tokenHash: "seed_invitation_token_hash_001",
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✅ Project invitation created for: ${invitation.email}`);

  // =========================================================================
  // 5. Milestones (Approved, In-Progress, Pending)
  // =========================================================================
  const milestone1 = await prisma.milestone.upsert({
    where: { id: SEED_IDS.milestone1 },
    update: {
      status: MilestoneStatus.APPROVED,
      verificationStatus: VerificationStatus.PASSED,
    },
    create: {
      id: SEED_IDS.milestone1,
      projectId: project.id,
      assignedDeveloperId: developer.id,
      submittedById: developer.id,
      title: "Frontend Foundation & Design System",
      description:
        "Initialize TypeScript + Vite workspace with Tailwind CSS and responsive layout architecture.",
      requirements: [
        "React 18 + Vite project scaffold with strict TypeScript",
        "Tailwind CSS design token system with reusable primitives",
        "Responsive app shell with navigation and header",
      ],
      paymentAmount: new Prisma.Decimal("4000.00"),
      currency: "USD",
      status: MilestoneStatus.APPROVED,
      verificationStatus: VerificationStatus.PASSED,
      orderIndex: 1,
      dueDate: new Date("2026-11-15T00:00:00.000Z"),
      submittedAt: new Date("2026-11-04T12:00:00.000Z"),
      approvedAt: new Date("2026-11-05T14:30:00.000Z"),
      paidAt: new Date("2026-11-06T10:15:00.000Z"),
    },
  });
  console.log(`  ✅ Milestone 1: ${milestone1.title} (${milestone1.status})`);

  const milestone2 = await prisma.milestone.upsert({
    where: { id: SEED_IDS.milestone2 },
    update: {
      status: MilestoneStatus.EVIDENCE_SUBMITTED,
      verificationStatus: VerificationStatus.MANUAL_REVIEW_REQUIRED,
    },
    create: {
      id: SEED_IDS.milestone2,
      projectId: project.id,
      assignedDeveloperId: developer.id,
      submittedById: developer.id,
      title: "Product Catalog & Full-Text Search",
      description:
        "Product listing with category filtering, search autocomplete, and detail views.",
      requirements: [
        "Product catalog grid with pagination",
        "Faceted search filter by category and price",
        "Product detail route with image gallery",
      ],
      paymentAmount: new Prisma.Decimal("5000.00"),
      currency: "USD",
      status: MilestoneStatus.EVIDENCE_SUBMITTED,
      verificationStatus: VerificationStatus.MANUAL_REVIEW_REQUIRED,
      orderIndex: 2,
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
      submittedAt: new Date("2026-11-08T09:00:00.000Z"),
    },
  });
  console.log(`  ✅ Milestone 2: ${milestone2.title} (${milestone2.status})`);

  const milestone3 = await prisma.milestone.upsert({
    where: { id: SEED_IDS.milestone3 },
    update: {
      status: MilestoneStatus.PENDING,
      verificationStatus: VerificationStatus.UNVERIFIED,
    },
    create: {
      id: SEED_IDS.milestone3,
      projectId: project.id,
      assignedDeveloperId: developer.id,
      title: "Checkout & PayPal Payment Orchestration",
      description:
        "Shopping cart, checkout validation, PayPal invoice generation, and webhook verification.",
      requirements: [
        "Shopping cart state persistence",
        "PayPal invoice generation API integration",
        "Webhook idempotency handling for payment captures",
      ],
      paymentAmount: new Prisma.Decimal("6000.00"),
      currency: "USD",
      status: MilestoneStatus.PENDING,
      verificationStatus: VerificationStatus.UNVERIFIED,
      orderIndex: 3,
      dueDate: new Date("2026-12-15T00:00:00.000Z"),
    },
  });
  console.log(`  ✅ Milestone 3: ${milestone3.title} (${milestone3.status})`);

  // =========================================================================
  // 6. Evidence (Milestone 1)
  // =========================================================================
  await prisma.evidence.upsert({
    where: { id: SEED_IDS.evidence1 },
    update: {},
    create: {
      id: SEED_IDS.evidence1,
      milestoneId: milestone1.id,
      uploadedById: developer.id,
      type: EvidenceType.GITHUB_PR,
      title: "PR #12: Design System & Foundation Components",
      description: "Added Button, Card, Input, Modal with Storybook stories and unit tests.",
      githubPrNumber: 12,
      githubRepoOwner: "alex-rivera-dev",
      githubRepoName: "ecommerce-redesign",
      externalUrl: "https://github.com/alex-rivera-dev/ecommerce-redesign/pull/12",
    },
  });

  await prisma.evidence.upsert({
    where: { id: SEED_IDS.evidence2 },
    update: {},
    create: {
      id: SEED_IDS.evidence2,
      milestoneId: milestone1.id,
      uploadedById: developer.id,
      type: EvidenceType.GITHUB_COMMIT,
      title: "commit 4a3f12: App Shell Layout & Navigation",
      description: "Implemented responsive navigation, header, and collapsible sidebar.",
      githubCommitSha: "4a3f12c8b7e6d5a4",
      githubRepoOwner: "alex-rivera-dev",
      githubRepoName: "ecommerce-redesign",
      externalUrl: "https://github.com/alex-rivera-dev/ecommerce-redesign/commit/4a3f12c8b7e6d5a4",
    },
  });
  console.log("  ✅ Evidence records created for milestone 1");

  // =========================================================================
  // 7. Verification Result & AI Analysis (Milestone 1)
  // =========================================================================
  const verificationResult = await prisma.verificationResult.upsert({
    where: { milestoneId: milestone1.id },
    update: {
      status: VerificationStatus.PASSED,
      overallScore: 96,
    },
    create: {
      id: SEED_IDS.verificationResult1,
      milestoneId: milestone1.id,
      status: VerificationStatus.PASSED,
      overallScore: 96,
      summary:
        "All requirements satisfied. PR #12 and commit 4a3f12 provide complete verifiable evidence.",
      checklistResults: [
        { requirement: "React 18 + Vite project scaffold", verified: true, confidence: 0.99 },
        { requirement: "Tailwind CSS design token system", verified: true, confidence: 0.95 },
        { requirement: "Responsive app shell", verified: true, confidence: 0.95 },
      ],
      recommendations: ["Ensure automated accessibility checks are configured in CI."],
      modelName: "gemini-2.0-flash",
    },
  });

  await prisma.aIAnalysis.upsert({
    where: { id: SEED_IDS.aiAnalysis1 },
    update: {},
    create: {
      id: SEED_IDS.aiAnalysis1,
      verificationResultId: verificationResult.id,
      projectId: project.id,
      agentType: "MILESTONE_VERIFICATION",
      promptTokens: 1450,
      completionTokens: 380,
      rawResponse: JSON.stringify({ verified: true, score: 96 }),
    },
  });
  console.log("  ✅ Verification result & AI analysis created");

  // =========================================================================
  // 8. Milestone Approval (Human Reviewer)
  // =========================================================================
  await prisma.milestoneApproval.upsert({
    where: { id: SEED_IDS.approval1 },
    update: { decision: "APPROVED" },
    create: {
      id: SEED_IDS.approval1,
      milestoneId: milestone1.id,
      approvedById: client.id,
      decision: "APPROVED",
      feedback: "Components and layout verified on preview deployment. Excellent quality.",
    },
  });
  console.log("  ✅ Milestone approval recorded (Client authorization)");

  // =========================================================================
  // 9. Payment Record (Milestone 1)
  // =========================================================================
  const payment = await prisma.payment.upsert({
    where: { id: SEED_IDS.payment1 },
    update: {
      status: PaymentStatus.PAID,
      payoutStatus: PaymentPayoutStatus.DISBURSED,
    },
    create: {
      id: SEED_IDS.payment1,
      milestoneId: milestone1.id,
      createdById: developer.id,
      invoiceVersion: 1,
      paypalInvoiceId: "INV2-DEMO-PAYPAL-001",
      paypalInvoiceUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-DEMO-PAYPAL-001",
      status: PaymentStatus.PAID,
      payoutStatus: PaymentPayoutStatus.DISBURSED,
      snapshotAmount: new Prisma.Decimal("4000.00"),
      settledAmount: new Prisma.Decimal("4000.00"),
      netReceivedAmount: new Prisma.Decimal("3880.00"),
      feeAmount: new Prisma.Decimal("120.00"),
      refundedAmount: new Prisma.Decimal("0.00"),
      netRefundDeducted: new Prisma.Decimal("0.00"),
      snapshotCurrency: "USD",
      payerEmail: client.email,
      beneficiaryEmail: developer.email,
      paidAt: new Date("2026-11-06T10:15:00.000Z"),
      idempotencyKey: "idemp_pay_seed_001",
      referenceId: "ref_pay_seed_001",
    },
  });
  console.log(`  ✅ Payment record: ${payment.paypalInvoiceId} (${payment.status})`);

  // =========================================================================
  // 10. Payment Capture (Verified Inbound Settlement)
  // =========================================================================
  const capture = await prisma.paymentCapture.upsert({
    where: { paypalCaptureId: "CAPTURE-SEED-001" },
    update: { status: CaptureStatus.COMPLETED },
    create: {
      id: SEED_IDS.capture1,
      paymentId: payment.id,
      paypalCaptureId: "CAPTURE-SEED-001",
      status: CaptureStatus.COMPLETED,
      grossAmount: new Prisma.Decimal("4000.00"),
      feeAmount: new Prisma.Decimal("120.00"),
      netAmount: new Prisma.Decimal("3880.00"),
      currency: "USD",
      feeStatus: CaptureFeeStatus.VERIFIED,
      capturedAt: new Date("2026-11-06T10:15:00.000Z"),
      rawResponse: { id: "CAPTURE-SEED-001", status: "COMPLETED", seller_protection: { status: "ELIGIBLE" } },
    },
  });
  console.log(`  ✅ Payment capture recorded: ${capture.paypalCaptureId}`);

  // =========================================================================
  // 11. Payout Record (Admin Disbursed Payout)
  // =========================================================================
  await prisma.payoutRecord.upsert({
    where: { idempotencyKey: "idemp_payout_seed_001" },
    update: { status: PayoutRecordStatus.DISBURSED },
    create: {
      id: SEED_IDS.payout1,
      paymentId: payment.id,
      provider: PayoutProvider.PAYPAL_PAYOUTS,
      providerItemId: "PAYOUT-ITEM-SEED-001",
      amount: new Prisma.Decimal("3880.00"),
      currency: "USD",
      beneficiaryEmail: developer.email,
      status: PayoutRecordStatus.DISBURSED,
      idempotencyKey: "idemp_payout_seed_001",
      adminUserId: admin.id,
      initiatedAt: new Date("2026-11-06T11:00:00.000Z"),
      disbursedAt: new Date("2026-11-06T11:05:00.000Z"),
    },
  });
  console.log("  ✅ Payout record confirmed (Admin disbursement)");

  // =========================================================================
  // 12. Webhook Event (Idempotent Event Log)
  // =========================================================================
  await prisma.webhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: "PAYPAL",
        eventId: "WH-SEED-EVENT-001",
      },
    },
    update: { status: "PROCESSED" },
    create: {
      id: SEED_IDS.webhook1,
      provider: "PAYPAL",
      eventId: "WH-SEED-EVENT-001",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      summary: "Payment capture confirmed for milestone invoice",
      resourceId: capture.paypalCaptureId,
      payload: {
        id: "WH-SEED-EVENT-001",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: { id: capture.paypalCaptureId, status: "COMPLETED" },
      },
      status: "PROCESSED",
      processedAt: new Date("2026-11-06T10:15:02.000Z"),
      paymentId: payment.id,
    },
  });
  console.log("  ✅ Webhook event recorded (Idempotency key active)");

  // =========================================================================
  // 13. Notifications
  // =========================================================================
  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif1 },
    update: {},
    create: {
      id: SEED_IDS.notif1,
      userId: developer.id,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: "Payment Received",
      message: "Payment of $4,000.00 confirmed for Milestone 1.",
      linkUrl: `/projects/${project.id}/milestones/${milestone1.id}`,
      isRead: true,
    },
  });

  await prisma.notification.upsert({
    where: { id: SEED_IDS.notif2 },
    update: {},
    create: {
      id: SEED_IDS.notif2,
      userId: client.id,
      type: NotificationType.MILESTONE_SUBMITTED,
      title: "Milestone Ready for Review",
      message: "Product Catalog & Full-Text Search is submitted for review.",
      linkUrl: `/projects/${project.id}/milestones/${milestone2.id}`,
      isRead: false,
    },
  });
  console.log("  ✅ Notifications created");

  // =========================================================================
  // 14. Activity Logs (Audit Trail)
  // =========================================================================
  await prisma.activityLog.upsert({
    where: { id: SEED_IDS.activity1 },
    update: {},
    create: {
      id: SEED_IDS.activity1,
      projectId: project.id,
      userId: developer.id,
      action: ActivityAction.PROJECT_CREATED,
      entityType: "project",
      entityId: project.id,
      details: { title: project.title, budget: 15000 },
    },
  });

  await prisma.activityLog.upsert({
    where: { id: SEED_IDS.activity2 },
    update: {},
    create: {
      id: SEED_IDS.activity2,
      projectId: project.id,
      userId: client.id,
      action: ActivityAction.MILESTONE_APPROVED,
      entityType: "milestone",
      entityId: milestone1.id,
      details: { milestoneTitle: milestone1.title, decision: "APPROVED" },
    },
  });

  await prisma.activityLog.upsert({
    where: { id: SEED_IDS.activity3 },
    update: {},
    create: {
      id: SEED_IDS.activity3,
      projectId: project.id,
      userId: developer.id,
      action: ActivityAction.PAYMENT_RECEIVED,
      entityType: "payment",
      entityId: payment.id,
      details: { amount: 4000, currency: "USD" },
    },
  });
  console.log("  ✅ Activity logs recorded");

  console.log("\n🎉 Seed complete! DevFlow database is successfully populated.");
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
