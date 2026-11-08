// =============================================================================
// DevFlow – Non-Destructive Database Validation Tests
// =============================================================================
// Tests FK integrity, unique constraints, webhook idempotency, CRUD, and
// transaction behavior. Uses test data isolated by unique emails/IDs and
// cleans up after itself. Does NOT modify existing seed data.
// =============================================================================

import { PrismaClient, Prisma } from "@prisma/client";

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

// Track IDs for cleanup
const cleanupIds: { table: string; id: string }[] = [];

async function cleanup() {
  // Reverse order to respect FK constraints
  for (const { table, id } of cleanupIds.reverse()) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE id = $1::uuid`,
        id
      );
    } catch {
      // Ignore cleanup errors — rows may already be deleted by cascade
    }
  }
}

async function main() {
  console.log("🔍 DevFlow Database Validation Tests\n");

  // =========================================================================
  // PHASE 3: Seed Data Validation
  // =========================================================================
  console.log("── Phase 3: Seed Data Validation ──");

  try {
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.projectMember.count(),
      prisma.milestone.count(),
      prisma.acceptanceCriterion.count(),
      prisma.githubRepository.count(),
      prisma.evidence.count(),
      prisma.aiAnalysis.count(),
      prisma.milestoneApproval.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.webhookEvent.count(),
      prisma.notification.count(),
      prisma.auditLog.count(),
    ]);
    const expected = [2, 1, 2, 3, 9, 1, 2, 1, 1, 1, 1, 1, 2, 4];
    const tables = [
      "users",
      "projects",
      "project_members",
      "milestones",
      "acceptance_criteria",
      "github_repositories",
      "evidence",
      "ai_analyses",
      "milestone_approvals",
      "invoices",
      "payments",
      "webhook_events",
      "notifications",
      "audit_logs",
    ];
    const total = expected.reduce((a, b) => a + b, 0);
    const actualTotal = counts.reduce((a, b) => a + b, 0);

    if (actualTotal === total) {
      ok(`Seed data: ${actualTotal} total records across 14 tables`);
    } else {
      fail(`Seed data total`, `Expected ${total}, got ${actualTotal}`);
    }

    // Check each table
    for (let i = 0; i < tables.length; i++) {
      if (counts[i] === expected[i]) {
        ok(`  ${tables[i]}: ${counts[i]} rows`);
      } else {
        fail(
          `  ${tables[i]}`,
          `Expected ${expected[i]}, got ${counts[i]}`
        );
      }
    }
  } catch (e) {
    fail("Seed data counts", e);
  }

  // Verify FK chain: project → milestone → evidence → repo
  try {
    const milestone = await prisma.milestone.findFirst({
      where: { status: "approved" },
      include: {
        project: true,
        evidence: { include: { githubRepository: true } },
        approvals: { include: { approver: true } },
        invoices: { include: { payments: true } },
      },
    });
    if (!milestone) throw new Error("No approved milestone found");
    if (!milestone.project) throw new Error("Missing project relation");
    if (milestone.evidence.length === 0)
      throw new Error("Missing evidence");
    if (milestone.approvals.length === 0)
      throw new Error("Missing approvals");
    if (milestone.approvals[0].approver === null)
      throw new Error("Approval has no human approver");
    if (milestone.invoices.length === 0)
      throw new Error("Missing invoices");
    if (milestone.invoices[0].payments.length === 0)
      throw new Error("Missing payments");
    ok(
      "FK chain: project → milestone → evidence → repo → approval → invoice → payment"
    );
  } catch (e) {
    fail("FK chain integrity", e);
  }

  // =========================================================================
  // PHASE 4: Security Validation
  // =========================================================================
  console.log("\n── Phase 4: Security Validation ──");

  // Test 1: Webhook idempotency — duplicate event_id should fail
  try {
    await prisma.webhookEvent.create({
      data: {
        source: "paypal",
        eventId: "WH-SEED-EVENT-001", // Same as seed data
        eventType: "INVOICING.INVOICE.PAID",
        payload: {},
        status: "received",
      },
    });
    fail(
      "Webhook idempotency",
      "Duplicate webhook event was accepted (UNIQUE constraint not enforced)"
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      ok("Webhook idempotency: duplicate event_id correctly rejected (P2002)");
    } else {
      fail("Webhook idempotency", e);
    }
  }

  // Test 2: Unique email constraint
  try {
    await prisma.user.create({
      data: {
        email: "alex.developer@example.com", // Same as seed
        name: "Duplicate User",
      },
    });
    fail("Email uniqueness", "Duplicate email was accepted");
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      ok("Email uniqueness: duplicate email correctly rejected (P2002)");
    } else {
      fail("Email uniqueness", e);
    }
  }

  // Test 3: Unique github_id constraint
  try {
    await prisma.user.create({
      data: {
        email: "unique-test@example.com",
        name: "GH ID Test",
        githubId: "12345678", // Same as seed
      },
    });
    fail("GitHub ID uniqueness", "Duplicate github_id was accepted");
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      ok("GitHub ID uniqueness: duplicate github_id correctly rejected (P2002)");
    } else {
      fail("GitHub ID uniqueness", e);
    }
  }

  // Test 4: Unique PayPal payment ID constraint
  try {
    const invoice = await prisma.invoice.findFirst();
    if (!invoice) throw new Error("No invoice found for test");
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        paypalPaymentId: "PAY-SEED-1234567890", // Same as seed
        amount: 100,
        currency: "USD",
        status: "completed",
        paidAt: new Date(),
      },
    });
    fail(
      "PayPal payment ID uniqueness",
      "Duplicate paypal_payment_id was accepted"
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      ok(
        "PayPal payment ID uniqueness: duplicate correctly rejected (P2002)"
      );
    } else {
      fail("PayPal payment ID uniqueness", e);
    }
  }

  // Test 5: Unique project member constraint
  try {
    const member = await prisma.projectMember.findFirst();
    if (!member) throw new Error("No project member found");
    await prisma.projectMember.create({
      data: {
        projectId: member.projectId,
        userId: member.userId,
        role: "viewer",
      },
    });
    fail(
      "Project member uniqueness",
      "Duplicate (project_id, user_id) was accepted"
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      ok(
        "Project member uniqueness: duplicate (project_id, user_id) correctly rejected (P2002)"
      );
    } else {
      fail("Project member uniqueness", e);
    }
  }

  // Test 6: milestone_approvals.approved_by is NOT NULL at DB level
  try {
    const milestone = await prisma.milestone.findFirst();
    if (!milestone) throw new Error("No milestone found");
    await prisma.$executeRaw`
      INSERT INTO milestone_approvals (id, milestone_id, approved_by, decision, decided_at)
      VALUES (gen_random_uuid(), ${milestone.id}::uuid, NULL, 'approved', NOW())
    `;
    fail(
      "Human-only approval enforcement",
      "NULL approved_by was accepted at DB level"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not-null") || msg.includes("NOT NULL") || msg.includes("null value") || msg.includes("23502")) {
      ok(
        "Human-only approval: NULL approved_by correctly rejected at DB level (23502 not_null_violation)"
      );
    } else {
      fail("Human-only approval enforcement", e);
    }
  }

  // Test 7: invoices.created_by is NOT NULL at DB level
  try {
    const milestone = await prisma.milestone.findFirst();
    const project = await prisma.project.findFirst();
    if (!milestone || !project) throw new Error("No milestone/project found");
    await prisma.$executeRaw`
      INSERT INTO invoices (id, milestone_id, project_id, status, amount, currency, recipient_email, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), ${milestone.id}::uuid, ${project.id}::uuid, 'draft', 100.00, 'USD', 'test@test.com', NULL, NOW(), NOW())
    `;
    fail(
      "Invoice human authorization",
      "NULL created_by was accepted at DB level"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not-null") || msg.includes("NOT NULL") || msg.includes("null value") || msg.includes("23502")) {
      ok(
        "Invoice human authorization: NULL created_by correctly rejected at DB level (23502 not_null_violation)"
      );
    } else {
      fail("Invoice human authorization", e);
    }
  }

  // Test 8: Monetary fields use Decimal (check via Prisma types)
  try {
    const invoice = await prisma.invoice.findFirst();
    if (!invoice) throw new Error("No invoice found");
    // Prisma returns Decimal objects for Decimal columns
    const amount = invoice.amount;
    if (
      typeof amount === "object" &&
      amount !== null &&
      "toFixed" in amount
    ) {
      ok(`Monetary precision: invoice.amount = ${amount} (Decimal object)`);
    } else if (typeof amount === "string") {
      // Some Prisma versions return string for Decimal
      ok(
        `Monetary precision: invoice.amount = "${amount}" (Decimal as string)`
      );
    } else {
      fail(
        "Monetary precision",
        `invoice.amount is ${typeof amount}, expected Decimal/string`
      );
    }
  } catch (e) {
    fail("Monetary precision", e);
  }

  // Test 9: FK RESTRICT — cannot delete user with invoices
  try {
    const invoice = await prisma.invoice.findFirst({
      include: { creator: true },
    });
    if (!invoice) throw new Error("No invoice found");
    await prisma.user.delete({ where: { id: invoice.createdBy } });
    fail(
      "FK RESTRICT on user deletion",
      "User with invoices was deleted (RESTRICT not enforced)"
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      ok(
        "FK RESTRICT: cannot delete user who created invoices (P2003)"
      );
    } else {
      fail("FK RESTRICT on user deletion", e);
    }
  }

  // Test 10: FK RESTRICT — cannot delete milestone with approval
  try {
    const approval = await prisma.milestoneApproval.findFirst();
    if (!approval) throw new Error("No approval found");
    await prisma.milestone.delete({
      where: { id: approval.milestoneId },
    });
    fail(
      "FK RESTRICT on milestone deletion",
      "Milestone with approval was deleted"
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2003" || e.code === "P2014")
    ) {
      ok(
        "FK RESTRICT: cannot delete milestone with approval records"
      );
    } else {
      fail("FK RESTRICT on milestone deletion", e);
    }
  }

  // =========================================================================
  // PHASE 6: CRUD & Transaction Tests
  // =========================================================================
  console.log("\n── Phase 6: CRUD & Transaction Tests ──");

  // Test: Create a test user, project, milestone, then clean up
  let testUserId: string | null = null;
  let testProjectId: string | null = null;
  let testMilestoneId: string | null = null;

  try {
    const testUser = await prisma.user.create({
      data: {
        email: "validation-test-user@devflow-test.local",
        name: "Validation Test User",
        role: "developer",
      },
    });
    testUserId = testUser.id;
    cleanupIds.push({ table: "users", id: testUser.id });

    // Verify UUID format (v4-like)
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        testUser.id
      )
    ) {
      ok(`CRUD create user: UUID ${testUser.id.substring(0, 8)}...`);
    } else {
      fail("UUID format", `Got: ${testUser.id}`);
    }

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        title: "Validation Test Project",
        status: "draft",
        budgetAmount: 1000.5,
        ownerId: testUser.id,
        clientId: testUser.id, // Self for test
      },
    });
    testProjectId = testProject.id;
    cleanupIds.push({ table: "projects", id: testProject.id });
    ok("CRUD create project with Decimal budget");

    // Create test milestone
    const testMilestone = await prisma.milestone.create({
      data: {
        projectId: testProject.id,
        title: "Test Milestone",
        position: 1,
        amount: 500.25,
      },
    });
    testMilestoneId = testMilestone.id;
    cleanupIds.push({ table: "milestones", id: testMilestone.id });
    ok("CRUD create milestone");

    // Update milestone
    const updated = await prisma.milestone.update({
      where: { id: testMilestone.id },
      data: { status: "in_progress" },
    });
    if (updated.status === "in_progress") {
      ok("CRUD update milestone status");
    } else {
      fail("CRUD update", `Status is ${updated.status}`);
    }

    // Soft delete test
    const softDeleted = await prisma.milestone.update({
      where: { id: testMilestone.id },
      data: { deletedAt: new Date() },
    });
    if (softDeleted.deletedAt !== null) {
      ok("Soft delete: deletedAt set successfully");
    } else {
      fail("Soft delete", "deletedAt is still null");
    }

    // Soft-deleted record is still queryable (Prisma does NOT auto-filter)
    const found = await prisma.milestone.findUnique({
      where: { id: testMilestone.id },
    });
    if (found !== null) {
      ok(
        "Soft delete caveat: Prisma does NOT auto-filter deleted records (backend must add WHERE deletedAt IS NULL)"
      );
    } else {
      fail(
        "Soft delete query",
        "Soft-deleted record not found — unexpected"
      );
    }

    // Transaction test: atomic multi-table insert
    try {
      await prisma.$transaction(async (tx) => {
        const notif = await tx.notification.create({
          data: {
            userId: testUser.id,
            type: "test",
            title: "Transaction Test",
          },
        });
        cleanupIds.push({ table: "notifications", id: notif.id });

        const audit = await tx.auditLog.create({
          data: {
            userId: testUser.id,
            action: "test.transaction",
            entityType: "milestone",
            entityId: testMilestone.id,
            newValues: { test: true },
          },
        });
        cleanupIds.push({ table: "audit_logs", id: audit.id });
        return { notif, audit };
      });
      ok("Transaction: atomic multi-table insert succeeded");
    } catch (e) {
      fail("Transaction test", e);
    }

    // Transaction rollback test
    try {
      await prisma.$transaction(async (tx) => {
        await tx.notification.create({
          data: {
            userId: testUser.id,
            type: "rollback_test",
            title: "Should Be Rolled Back",
          },
        });
        // Force error
        throw new Error("Intentional rollback");
      });
      fail("Transaction rollback", "Did not throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "Intentional rollback") {
        // Verify the notification was NOT created
        const rollbackCheck = await prisma.notification.findFirst({
          where: {
            userId: testUser.id,
            type: "rollback_test",
          },
        });
        if (rollbackCheck === null) {
          ok("Transaction rollback: notification correctly NOT created");
        } else {
          cleanupIds.push({
            table: "notifications",
            id: rollbackCheck.id,
          });
          fail(
            "Transaction rollback",
            "Notification was created despite rollback"
          );
        }
      } else {
        fail("Transaction rollback", e);
      }
    }

    // CASCADE delete test: deleting project should cascade to milestone
    // (milestone has no invoices/approvals so cascade is safe)
    // First, un-softdelete the milestone so we can verify it via cascade
    await prisma.milestone.update({
      where: { id: testMilestone.id },
      data: { deletedAt: null },
    });

    await prisma.project.delete({ where: { id: testProject.id } });
    const cascadedMilestone = await prisma.milestone.findUnique({
      where: { id: testMilestone.id },
    });
    if (cascadedMilestone === null) {
      ok("CASCADE delete: milestone deleted when project deleted");
      // Remove from cleanup since already deleted
      const idx1 = cleanupIds.findIndex(
        (c) => c.table === "milestones" && c.id === testMilestone.id
      );
      if (idx1 >= 0) cleanupIds.splice(idx1, 1);
      const idx2 = cleanupIds.findIndex(
        (c) => c.table === "projects" && c.id === testProject.id
      );
      if (idx2 >= 0) cleanupIds.splice(idx2, 1);
    } else {
      fail("CASCADE delete", "Milestone still exists after project deletion");
    }
  } catch (e) {
    fail("CRUD test sequence", e);
  }

  // =========================================================================
  // Cleanup
  // =========================================================================
  await cleanup();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n══════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════");

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  ❌ ${f}`));
  }

  console.log();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(async (e) => {
    console.error("Fatal error:", e);
    await cleanup();
    await prisma.$disconnect();
    process.exit(1);
  });
