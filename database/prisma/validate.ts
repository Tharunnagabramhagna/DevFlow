// =============================================================================
// DevFlow – Non-Destructive Database Validation Tests
// =============================================================================
// Validates the DevFlow database against the authoritative schema:
// - Model availability and Prisma Client generation
// - Seed data integrity and foreign-key traversal
// - Unique constraints and webhook / payment idempotency
// - Milestone approval workflows and authorization requirements
// - Database-level check constraints (counterparty separation, positive amounts)
// - Decimal monetary precision
// - Transaction atomicity and rollback
// - Strict non-destructive cleanup: collects all deletion errors with model
//   and ID, ensures reverse dependency deletion order, and fails validation
//   if any tracked test artifact cannot be removed or confirmed absent.
//
// Run from project root:
//   npm run db:test
// =============================================================================

import {
  PrismaClient,
  Prisma,
  Role,
  ProjectStatus,
  ProjectMemberRole,
  MilestoneStatus,
  VerificationStatus,
  EvidenceType,
  PaymentStatus,
  NotificationType,
  ActivityAction,
} from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name: string, err: unknown) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  failures.push(`${name}: ${msg}`);
  console.log(`  ❌ ${name}: ${msg}`);
}

// Track IDs created exclusively by this validation run for strict reverse cleanup
interface TestCreatedIds {
  activityLogs: string[];
  notifications: string[];
  webhookEvents: string[];
  payoutRecords: string[];
  paymentRefunds: string[];
  paymentCaptures: string[];
  payments: string[];
  milestoneApprovals: string[];
  aiAnalyses: string[];
  verificationResults: string[];
  evidences: string[];
  milestones: string[];
  projectInvitations: string[];
  projectMembers: { projectId: string; userId: string }[];
  projects: string[];
  users: string[];
}

const testCreatedIds: TestCreatedIds = {
  activityLogs: [],
  notifications: [],
  webhookEvents: [],
  payoutRecords: [],
  paymentRefunds: [],
  paymentCaptures: [],
  payments: [],
  milestoneApprovals: [],
  aiAnalyses: [],
  verificationResults: [],
  evidences: [],
  milestones: [],
  projectInvitations: [],
  projectMembers: [],
  projects: [],
  users: [],
};

export interface CleanupFailure {
  model: string;
  id: string;
  error: string;
}

/**
 * Safely attempts deletion of a tracked record by its exact identifier.
 * Treats Prisma P2025 (Record to delete does not exist) as successful
 * (confirmed absent, e.g. already removed by parent CASCADE).
 * Any other error is captured as an explicit cleanup failure.
 */
async function deleteTrackedRecord(
  model: string,
  id: string,
  deleteFn: () => Promise<unknown>,
  failuresList: CleanupFailure[]
): Promise<void> {
  try {
    await deleteFn();
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      // Record is already absent (e.g., cascaded by prior deletion) — safe
      return;
    }
    failuresList.push({
      model,
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Removes all records created during the validation run in reverse dependency
 * order. Never uses unrestricted deleteMany() and never deletes untracked records.
 */
async function cleanupTestArtifacts(): Promise<{ success: boolean; failures: CleanupFailure[] }> {
  const failuresList: CleanupFailure[] = [];

  // 1. Activity Logs (depend on project, user)
  for (const id of testCreatedIds.activityLogs) {
    await deleteTrackedRecord("ActivityLog", id, () => prisma.activityLog.delete({ where: { id } }), failuresList);
  }

  // 2. Notifications (depend on user)
  for (const id of testCreatedIds.notifications) {
    await deleteTrackedRecord("Notification", id, () => prisma.notification.delete({ where: { id } }), failuresList);
  }

  // 3. Webhook Events (depend on payment)
  for (const id of testCreatedIds.webhookEvents) {
    await deleteTrackedRecord("WebhookEvent", id, () => prisma.webhookEvent.delete({ where: { id } }), failuresList);
  }

  // 4. Payout Records (depend on payment, adminUser)
  for (const id of testCreatedIds.payoutRecords) {
    await deleteTrackedRecord("PayoutRecord", id, () => prisma.payoutRecord.delete({ where: { id } }), failuresList);
  }

  // 5. Payment Refunds (depend on payment, capture)
  for (const id of testCreatedIds.paymentRefunds) {
    await deleteTrackedRecord("PaymentRefund", id, () => prisma.paymentRefund.delete({ where: { id } }), failuresList);
  }

  // 6. Payment Captures (depend on payment)
  for (const id of testCreatedIds.paymentCaptures) {
    await deleteTrackedRecord("PaymentCapture", id, () => prisma.paymentCapture.delete({ where: { id } }), failuresList);
  }

  // 7. Payments (depend on milestone, user)
  for (const id of testCreatedIds.payments) {
    await deleteTrackedRecord("Payment", id, () => prisma.payment.delete({ where: { id } }), failuresList);
  }

  // 8. Milestone Approvals (depend on milestone, approvedBy)
  for (const id of testCreatedIds.milestoneApprovals) {
    await deleteTrackedRecord("MilestoneApproval", id, () => prisma.milestoneApproval.delete({ where: { id } }), failuresList);
  }

  // 9. AI Analyses (depend on verificationResult, project)
  for (const id of testCreatedIds.aiAnalyses) {
    await deleteTrackedRecord("AIAnalysis", id, () => prisma.aIAnalysis.delete({ where: { id } }), failuresList);
  }

  // 10. Verification Results (depend on milestone)
  for (const id of testCreatedIds.verificationResults) {
    await deleteTrackedRecord("VerificationResult", id, () => prisma.verificationResult.delete({ where: { id } }), failuresList);
  }

  // 11. Evidences (depend on milestone, uploadedBy)
  for (const id of testCreatedIds.evidences) {
    await deleteTrackedRecord("Evidence", id, () => prisma.evidence.delete({ where: { id } }), failuresList);
  }

  // 12. Milestones (depend on project, users)
  for (const id of testCreatedIds.milestones) {
    await deleteTrackedRecord("Milestone", id, () => prisma.milestone.delete({ where: { id } }), failuresList);
  }

  // 13. Project Invitations (depend on project, invitedBy)
  for (const id of testCreatedIds.projectInvitations) {
    await deleteTrackedRecord("ProjectInvitation", id, () => prisma.projectInvitation.delete({ where: { id } }), failuresList);
  }

  // 14. Project Members (depend on project, user)
  for (const m of testCreatedIds.projectMembers) {
    await deleteTrackedRecord(
      "ProjectMember",
      `(${m.projectId}, ${m.userId})`,
      () => prisma.projectMember.delete({ where: { projectId_userId: { projectId: m.projectId, userId: m.userId } } }),
      failuresList
    );
  }

  // 15. Projects (depend on users)
  for (const id of testCreatedIds.projects) {
    await deleteTrackedRecord("Project", id, () => prisma.project.delete({ where: { id } }), failuresList);
  }

  // 16. Users (base entity)
  for (const id of testCreatedIds.users) {
    await deleteTrackedRecord("User", id, () => prisma.user.delete({ where: { id } }), failuresList);
  }

  return {
    success: failuresList.length === 0,
    failures: failuresList,
  };
}

async function main() {
  console.log("🔍 DevFlow Database Validation Suite (Integrated Schema)\n");
  const testRunNonce = Date.now().toString(36);

  try {
    // =========================================================================
    // SUITE 1: Prisma Client & Model Availability
    // =========================================================================
    console.log("── Suite 1: Prisma Model Availability ──");
    try {
      const expectedModels: (keyof PrismaClient)[] = [
        "user",
        "project",
        "projectMember",
        "projectInvitation",
        "milestone",
        "milestoneApproval",
        "evidence",
        "verificationResult",
        "aIAnalysis",
        "payment",
        "paymentCapture",
        "paymentRefund",
        "payoutRecord",
        "webhookEvent",
        "notification",
        "activityLog",
        "refreshToken",
        "passwordResetToken",
        "oAuthState",
        "oAuthExchangeCode",
        "accountLinkingChallenge",
      ];

      const available = expectedModels.filter((m) => typeof (prisma as any)[m] === "object");
      if (available.length === expectedModels.length) {
        ok(`All ${expectedModels.length} Prisma models are initialized and available`);
      } else {
        fail("Prisma models", `Missing models: ${expectedModels.filter((m) => !(prisma as any)[m]).join(", ")}`);
      }
    } catch (e) {
      fail("Prisma Model Availability", e);
    }

    // =========================================================================
    // SUITE 2: Seed Data Verification & Foreign-Key Traversal
    // =========================================================================
    console.log("\n── Suite 2: Seed Data Integrity & FK Traversal ──");
    try {
      const [userCount, projectCount, milestoneCount, paymentCount, captureCount, webhookCount] =
        await Promise.all([
          prisma.user.count(),
          prisma.project.count(),
          prisma.milestone.count(),
          prisma.payment.count(),
          prisma.paymentCapture.count(),
          prisma.webhookEvent.count(),
        ]);

      if (userCount >= 3 && projectCount >= 1 && milestoneCount >= 3 && paymentCount >= 1) {
        ok(`Seed records verified: ${userCount} users, ${projectCount} projects, ${milestoneCount} milestones, ${paymentCount} payments`);
      } else {
        fail("Seed counts", `Expected at least 3 users, 1 project, 3 milestones, 1 payment. Found: users=${userCount}, projects=${projectCount}`);
      }

      // Deep FK traversal through project -> milestones -> approvals, payments, captures, payouts
      const fullProject = await prisma.project.findFirst({
        where: { title: "E-Commerce Platform Redesign" },
        include: {
          createdBy: true,
          client: true,
          leadDeveloper: true,
          members: { include: { user: true } },
          milestones: {
            include: {
              approvals: { include: { approvedBy: true } },
              evidence: { include: { uploadedBy: true } },
              verificationResult: { include: { analyses: true } },
              payments: {
                include: {
                  captures: true,
                  payoutRecords: { include: { adminUser: true } },
                  webhookEvents: true,
                },
              },
            },
          },
        },
      });

      if (!fullProject) throw new Error("Seed project 'E-Commerce Platform Redesign' not found");
      if (!fullProject.client || !fullProject.leadDeveloper) throw new Error("Project counterparties missing");
      if (fullProject.milestones.length === 0) throw new Error("Project has no milestones");

      const approvedMilestone = fullProject.milestones.find((m) => m.status === MilestoneStatus.APPROVED);
      if (!approvedMilestone) throw new Error("Approved milestone not found");
      if (approvedMilestone.approvals.length === 0) throw new Error("Approved milestone has no approval record");
      if (!approvedMilestone.approvals[0].approvedBy) throw new Error("Approval has no human approver");
      if (approvedMilestone.payments.length === 0) throw new Error("Approved milestone has no payment record");

      ok("FK graph traversal: project -> members -> milestones -> approvals -> payments -> captures -> payouts");
    } catch (e) {
      fail("Seed Data & FK Traversal", e);
    }

    // =========================================================================
    // SUITE 3: Unique Constraints & Idempotency
    // =========================================================================
    console.log("\n── Suite 3: Unique Constraints & Idempotency ──");

    // Test: Duplicate user email rejection
    try {
      const dupeUser = await prisma.user.create({
        data: {
          email: "alex.developer@example.com", // existing seed email
          name: "Duplicate User",
          role: Role.FREELANCER,
        },
      });
      testCreatedIds.users.push(dupeUser.id);
      fail("Email uniqueness", "Duplicate email was accepted");
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        ok("Email uniqueness: duplicate email correctly rejected (P2002)");
      } else {
        fail("Email uniqueness", e);
      }
    }

    // Test: Duplicate GitHub ID rejection
    try {
      const dupeGh = await prisma.user.create({
        data: {
          email: `unique_${testRunNonce}@example.com`,
          name: "Duplicate GitHub User",
          githubId: "12345678", // existing seed githubId
          role: Role.FREELANCER,
        },
      });
      testCreatedIds.users.push(dupeGh.id);
      fail("GitHub ID uniqueness", "Duplicate githubId was accepted");
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        ok("GitHub ID uniqueness: duplicate githubId correctly rejected (P2002)");
      } else {
        fail("GitHub ID uniqueness", e);
      }
    }

    // Test: Webhook Idempotency (provider + eventId composite unique)
    try {
      const dupeWh = await prisma.webhookEvent.create({
        data: {
          provider: "PAYPAL",
          eventId: "WH-SEED-EVENT-001", // existing seed eventId
          eventType: "PAYMENT.CAPTURE.COMPLETED",
          payload: { test: true },
          status: "RECEIVED",
        },
      });
      testCreatedIds.webhookEvents.push(dupeWh.id);
      fail("Webhook idempotency", "Duplicate webhookEvent was accepted");
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        ok("Webhook idempotency: duplicate (provider, eventId) correctly rejected (P2002)");
      } else {
        fail("Webhook idempotency", e);
      }
    }

    // Test: Payment idempotencyKey uniqueness
    try {
      const firstMilestone = await prisma.milestone.findFirst();
      const firstUser = await prisma.user.findFirst();
      if (!firstMilestone || !firstUser) throw new Error("Missing prerequisite seed data");

      const dupePay = await prisma.payment.create({
        data: {
          milestoneId: firstMilestone.id,
          createdById: firstUser.id,
          invoiceVersion: 99,
          snapshotAmount: new Prisma.Decimal("100.00"),
          snapshotCurrency: "USD",
          payerEmail: "payer@example.com",
          beneficiaryEmail: "dev@example.com",
          idempotencyKey: "idemp_pay_seed_001", // duplicate
          referenceId: `ref_unique_test_${testRunNonce}`,
        },
      });
      testCreatedIds.payments.push(dupePay.id);
      fail("Payment idempotency", "Duplicate payment idempotencyKey was accepted");
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        ok("Payment idempotency: duplicate idempotencyKey correctly rejected (P2002)");
      } else {
        fail("Payment idempotency", e);
      }
    }

    // =========================================================================
    // SUITE 4: Milestone Approval & Authorization Workflow
    // =========================================================================
    console.log("\n── Suite 4: Milestone Approval Workflow ──");
    try {
      // 1. Create dedicated test users (Client & Developer)
      const testClient = await prisma.user.create({
        data: {
          email: `test_client_${testRunNonce}@devflow-val.local`,
          name: "Test Validation Client",
          role: Role.CLIENT,
        },
      });
      testCreatedIds.users.push(testClient.id);

      const testDev = await prisma.user.create({
        data: {
          email: `test_dev_${testRunNonce}@devflow-val.local`,
          name: "Test Validation Dev",
          role: Role.FREELANCER,
        },
      });
      testCreatedIds.users.push(testDev.id);

      // 2. Create test project ensuring counterparty separation (client != leadDeveloper)
      const testProject = await prisma.project.create({
        data: {
          title: `Validation Test Project ${testRunNonce}`,
          status: ProjectStatus.DRAFT,
          createdById: testDev.id,
          clientId: testClient.id,
          leadDeveloperId: testDev.id,
          budget: new Prisma.Decimal("3000.00"),
          currency: "USD",
        },
      });
      testCreatedIds.projects.push(testProject.id);

      // 3. Create test milestone
      const testMilestone = await prisma.milestone.create({
        data: {
          projectId: testProject.id,
          title: "Test Deliverable 1",
          paymentAmount: new Prisma.Decimal("1500.50"),
          status: MilestoneStatus.EVIDENCE_SUBMITTED,
          requirements: ["Build authentication flow", "Unit test rate limiting"],
        },
      });
      testCreatedIds.milestones.push(testMilestone.id);

      // 4. Test approval creation: human client approves milestone
      const testApproval = await prisma.milestoneApproval.create({
        data: {
          milestoneId: testMilestone.id,
          approvedById: testClient.id,
          decision: "APPROVED",
          feedback: "Human client reviewed test deliverable and approved payment authorization.",
        },
      });
      testCreatedIds.milestoneApprovals.push(testApproval.id);

      if (testApproval.id && testApproval.approvedById === testClient.id) {
        ok("Human approval workflow: authorized client recorded on milestone approval");
      } else {
        fail("Approval workflow", "Approval record did not persist expected fields");
      }

      // 5. Verify referential integrity: attempting to create approval with invalid approver fails
      try {
        const invalidApproval = await prisma.milestoneApproval.create({
          data: {
            milestoneId: testMilestone.id,
            approvedById: "00000000-0000-0000-0000-000000000000", // invalid
            decision: "APPROVED",
          },
        });
        testCreatedIds.milestoneApprovals.push(invalidApproval.id);
        fail("Approval FK check", "Approval with non-existent approver was accepted");
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
          ok("Approval referential integrity: non-existent approver rejected (P2003)");
        } else {
          fail("Approval FK check", e);
        }
      }
    } catch (e) {
      fail("Milestone Approval Workflow", e);
    }

    // =========================================================================
    // SUITE 5: PostgreSQL Check Constraints
    // =========================================================================
    console.log("\n── Suite 5: Database Check Constraints ──");

    // Check 1: Counterparty separation check (clientId != leadDeveloperId)
    try {
      const singleUser = await prisma.user.findFirst();
      if (!singleUser) throw new Error("Missing user for test");

      const invalidProj = await prisma.project.create({
        data: {
          title: "Invalid Self-Dealing Project",
          createdById: singleUser.id,
          clientId: singleUser.id,        // SAME as leadDeveloperId
          leadDeveloperId: singleUser.id, // Violates check_counterparty_separation
          status: ProjectStatus.DRAFT,
        },
      });
      testCreatedIds.projects.push(invalidProj.id);
      fail("Counterparty separation", "Project with identical client and lead dev was accepted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("check_counterparty_separation") || msg.includes("23514")) {
        ok("Counterparty separation: identical client and lead developer rejected by PostgreSQL check constraint");
      } else {
        fail("Counterparty separation", e);
      }
    }

    // Check 2: Financial amount positive checks (payments.snapshotAmount > 0)
    try {
      const m = await prisma.milestone.findFirst();
      const u = await prisma.user.findFirst();
      if (!m || !u) throw new Error("Missing test milestone/user");

      const invalidPay = await prisma.payment.create({
        data: {
          milestoneId: m.id,
          createdById: u.id,
          snapshotAmount: new Prisma.Decimal("-150.00"), // Negative snapshot amount
          snapshotCurrency: "USD",
          payerEmail: "payer@example.com",
          beneficiaryEmail: "dev@example.com",
          idempotencyKey: `idemp_neg_test_${testRunNonce}`,
          referenceId: `ref_neg_test_${testRunNonce}`,
        },
      });
      testCreatedIds.payments.push(invalidPay.id);
      fail("Positive amount check", "Payment with negative snapshotAmount was accepted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("check_payment_positive_amounts") || msg.includes("23514")) {
        ok("Positive amounts: negative snapshotAmount rejected by check_payment_positive_amounts");
      } else {
        fail("Positive amount check", e);
      }
    }

    // =========================================================================
    // SUITE 6: Decimal Precision & Monetary Math
    // =========================================================================
    console.log("\n── Suite 6: Decimal Monetary Precision ──");
    try {
      const payment = await prisma.payment.findFirst({
        where: { id: "77777777-aaaa-4000-8000-000000000001" },
      });
      if (!payment) throw new Error("Seed payment record not found");

      const amount = payment.snapshotAmount;
      if (amount instanceof Prisma.Decimal && amount.toFixed(2) === "4000.00") {
        ok(`Decimal monetary precision verified: snapshotAmount is Prisma.Decimal ("${amount.toFixed(2)}")`);
      } else {
        fail("Decimal precision", `Expected Prisma.Decimal '4000.00', got: ${amount}`);
      }

      // Verify exact cent arithmetic without floating-point error
      const decA = new Prisma.Decimal("199.99");
      const decB = new Prisma.Decimal("0.01");
      const sum = decA.add(decB);
      if (sum.equals(new Prisma.Decimal("200.00"))) {
        ok("Decimal arithmetic: exact cent calculation verified (199.99 + 0.01 = 200.00)");
      } else {
        fail("Decimal arithmetic", `Expected 200.00, got: ${sum.toString()}`);
      }
    } catch (e) {
      fail("Decimal Monetary Precision", e);
    }

    // =========================================================================
    // SUITE 7: Transaction Atomicity & Rollback
    // =========================================================================
    console.log("\n── Suite 7: Transaction Behavior & Rollback ──");
    try {
      const devUser = await prisma.user.findFirst({ where: { role: Role.FREELANCER } });
      const clientUser = await prisma.user.findFirst({ where: { role: Role.CLIENT } });
      if (!devUser || !clientUser) throw new Error("Missing seed users for transaction test");

      // Atomic transaction: commit multiple records
      const [txProject, txNotif] = await prisma.$transaction(async (tx) => {
        const proj = await tx.project.create({
          data: {
            title: `TX Test Project ${testRunNonce}`,
            createdById: devUser.id,
            clientId: clientUser.id,
            leadDeveloperId: devUser.id,
          },
        });
        testCreatedIds.projects.push(proj.id);

        const notif = await tx.notification.create({
          data: {
            userId: devUser.id,
            type: NotificationType.SYSTEM_ALERT,
            title: "Transaction Test Notice",
            message: `Created for validation ${testRunNonce}`,
          },
        });
        testCreatedIds.notifications.push(notif.id);

        return [proj, notif];
      });

      if (txProject.id && txNotif.id) {
        ok("Transaction commit: multi-model atomic transaction committed successfully");
      }

      // Rollback test: intentional failure inside transaction
      // Note: We deliberately do NOT pre-track uncommitted IDs in testCreatedIds
      // unless the rollback fails and the record is confirmed present.
      const rollbackMarker = `rollback_${testRunNonce}`;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.notification.create({
            data: {
              userId: devUser.id,
              type: NotificationType.SYSTEM_ALERT,
              title: rollbackMarker,
              message: "Should be rolled back",
            },
          });
          throw new Error("INTENTIONAL_ROLLBACK_ERROR");
        });
        fail("Transaction rollback", "Transaction did not throw expected error");
      } catch (e: any) {
        if (e.message === "INTENTIONAL_ROLLBACK_ERROR") {
          const found = await prisma.notification.findFirst({ where: { title: rollbackMarker } });
          if (!found) {
            ok("Transaction rollback: atomic state rolled back completely on error");
          } else {
            // Rollback unexpectedly failed: track the stray record for cleanup
            testCreatedIds.notifications.push(found.id);
            fail("Transaction rollback", "Record was found in database despite rollback");
          }
        } else {
          fail("Transaction rollback", e);
        }
      }
    } catch (e) {
      fail("Transaction Behavior", e);
    }
  } finally {
    // =========================================================================
    // STRICT ISOLATED CLEANUP
    // =========================================================================
    console.log("\n── Cleanup ──");
    const cleanupResult = await cleanupTestArtifacts();

    if (cleanupResult.success) {
      ok("Validation cleanup: all tracked test artifacts verified deleted or confirmed absent");
    } else {
      failed++;
      console.log(`  ❌ Validation cleanup failed: ${cleanupResult.failures.length} artifact(s) could not be removed:`);
      cleanupResult.failures.forEach((f) => {
        const errorLine = `[${f.model}] ID ${f.id}: ${f.error}`;
        failures.push(`Cleanup failure: ${errorLine}`);
        console.log(`     - ${errorLine}`);
      });
    }

    console.log("\n══════════════════════════════════════════════════");
    console.log(`  Validation Results: ${passed} passed, ${failed} failed`);
    console.log("══════════════════════════════════════════════════");

    if (failures.length > 0) {
      console.log("\nFailed Checks:");
      failures.forEach((f) => console.log(`  ❌ ${f}`));
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch(async (e) => {
    console.error("Fatal validation runner error:", e);
    process.exitCode = 1;
    // Attempt emergency cleanup if main threw unexpectedly
    try {
      await cleanupTestArtifacts();
    } catch (cleanupErr) {
      console.error("Emergency cleanup error:", cleanupErr);
    }
  })
  .finally(async () => {
    // Guaranteed disconnect regardless of test or cleanup outcome
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      console.error("Error disconnecting Prisma Client:", disconnectErr);
    }
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }
  });
