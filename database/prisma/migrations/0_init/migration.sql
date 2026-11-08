-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'FREELANCER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'CLIENT', 'LEAD_DEVELOPER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectInvitationRole" AS ENUM ('CLIENT', 'LEAD_DEVELOPER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'EVIDENCE_SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PASSED', 'FAILED', 'MANUAL_REVIEW_REQUIRED', 'AI_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('FILE', 'GITHUB_COMMIT', 'GITHUB_PR', 'TEXT_NOTE', 'URL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CREATING', 'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAID', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'CANCELLED', 'FAILED', 'REFUNDED', 'MARKED_AS_REFUNDED', 'MANUAL_RECONCILIATION_REQUIRED');

-- CreateEnum
CREATE TYPE "PaymentPayoutStatus" AS ENUM ('AWAITING_PAYMENT', 'PLATFORM_HELD', 'DISBURSEMENT_IN_PROGRESS', 'PARTIALLY_DISBURSED', 'DISBURSED', 'DISBURSEMENT_PAUSED', 'PAYOUT_FAILED');

-- CreateEnum
CREATE TYPE "PayoutProvider" AS ENUM ('PAYPAL_PAYOUTS', 'MANUAL_TRANSFER');

-- CreateEnum
CREATE TYPE "PayoutRecordStatus" AS ENUM ('INITIATED', 'PROCESSING', 'DISBURSED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('COMPLETED', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DENIED', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CaptureFeeStatus" AS ENUM ('VERIFIED', 'PENDING_CONFIRMATION', 'MANUAL_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundFeeReversalStatus" AS ENUM ('VERIFIED', 'PENDING_CONFIRMATION', 'NO_FEE_REVERSAL');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('USER_REGISTERED', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'INVITATION_SENT', 'INVITATION_ACCEPTED', 'MILESTONE_CREATED', 'MILESTONE_UPDATED', 'EVIDENCE_SUBMITTED', 'AI_VERIFICATION_COMPLETED', 'MILESTONE_APPROVED', 'MILESTONE_REJECTED', 'INVOICE_CREATED', 'INVOICE_SENT', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED', 'PAYOUT_INITIATED', 'PAYOUT_CONFIRMED', 'PAYOUT_CANCELLED', 'PAYOUT_CANCELLED_BY_REFUND', 'PAYOUT_CLAIMED_FOR_DISPATCH', 'PAYOUT_DISBURSED', 'PAYOUT_FAILED', 'MANUAL_HOLD_APPLIED', 'MANUAL_HOLD_CLEARED', 'RECONCILIATION_RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVITATION_RECEIVED', 'INVITATION_ACCEPTED', 'MILESTONE_SUBMITTED', 'VERIFICATION_READY', 'MILESTONE_APPROVED', 'MILESTONE_REJECTED', 'INVOICE_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_REFUNDED', 'PAYOUT_DISBURSED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "Role" NOT NULL DEFAULT 'FREELANCER',
    "githubId" TEXT,
    "githubAccessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replacedByTokenId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "pkceVerifier" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_exchange_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_exchange_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_linking_challenges" (
    "id" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "encryptedGithubToken" TEXT NOT NULL,
    "otpHash" TEXT,
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxOtpAttempts" INTEGER NOT NULL DEFAULT 5,
    "otpSentAt" TIMESTAMP(3),
    "resendCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_linking_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "brief" TEXT,
    "budget" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "clientId" TEXT,
    "leadDeveloperId" TEXT,
    "githubRepoOwner" TEXT,
    "githubRepoName" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectInvitationRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assignedDeveloperId" TEXT,
    "submittedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT[],
    "paymentAmount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "publicToken" TEXT,
    "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_approvals" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "githubCommitSha" TEXT,
    "githubPrNumber" INTEGER,
    "githubRepoOwner" TEXT,
    "githubRepoName" TEXT,
    "externalUrl" TEXT,
    "textNote" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_results" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "checklistResults" JSONB NOT NULL DEFAULT '[]',
    "riskAssessment" JSONB,
    "recommendations" TEXT[],
    "modelName" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "verificationResultId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "invoiceVersion" INTEGER NOT NULL DEFAULT 1,
    "paypalInvoiceId" TEXT,
    "paypalInvoiceUrl" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payoutStatus" "PaymentPayoutStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "snapshotAmount" DECIMAL(12,2) NOT NULL,
    "settledAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netReceivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "feeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netRefundDeducted" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "snapshotCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "payerEmail" TEXT NOT NULL,
    "beneficiaryEmail" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "lastReconciledAt" TIMESTAMP(3),
    "reconciliationNotes" TEXT,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "referenceId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_captures" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "paypal_capture_id" VARCHAR(128) NOT NULL,
    "status" "CaptureStatus" NOT NULL DEFAULT 'PENDING',
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "fee_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL,
    "fee_status" "CaptureFeeStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "captured_at" TIMESTAMP(3) NOT NULL,
    "raw_response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "capture_id" TEXT NOT NULL,
    "paypal_refund_id" VARCHAR(128),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "fee_reversal_status" "RefundFeeReversalStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "fee_reversal_amount" DECIMAL(12,2),
    "net_deducted_amount" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL,
    "reason" TEXT,
    "raw_response" JSONB,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_records" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "provider" "PayoutProvider" NOT NULL DEFAULT 'PAYPAL_PAYOUTS',
    "provider_payout_batch_id" VARCHAR(128),
    "provider_item_id" VARCHAR(128),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "beneficiary_email" TEXT NOT NULL,
    "status" "PayoutRecordStatus" NOT NULL DEFAULT 'INITIATED',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "transfer_reference" VARCHAR(255),
    "admin_user_id" TEXT NOT NULL,
    "evidence_document_url" TEXT,
    "failure_reason" TEXT,
    "reconciliation_history" JSONB NOT NULL DEFAULT '[]',
    "raw_response" JSONB,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYPAL',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "summary" TEXT,
    "resourceId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentId" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ActivityAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replacedByTokenId_key" ON "refresh_tokens"("replacedByTokenId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_stateHash_key" ON "oauth_states"("stateHash");

-- CreateIndex
CREATE INDEX "oauth_states_stateHash_idx" ON "oauth_states"("stateHash");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_exchange_codes_codeHash_key" ON "oauth_exchange_codes"("codeHash");

-- CreateIndex
CREATE INDEX "oauth_exchange_codes_codeHash_idx" ON "oauth_exchange_codes"("codeHash");

-- CreateIndex
CREATE INDEX "oauth_exchange_codes_userId_idx" ON "oauth_exchange_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_linking_challenges_challengeHash_key" ON "account_linking_challenges"("challengeHash");

-- CreateIndex
CREATE INDEX "account_linking_challenges_challengeHash_idx" ON "account_linking_challenges"("challengeHash");

-- CreateIndex
CREATE INDEX "account_linking_challenges_userId_idx" ON "account_linking_challenges"("userId");

-- CreateIndex
CREATE INDEX "projects_createdById_idx" ON "projects"("createdById");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "projects_leadDeveloperId_idx" ON "projects"("leadDeveloperId");

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_tokenHash_key" ON "project_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "project_invitations_email_idx" ON "project_invitations"("email");

-- CreateIndex
CREATE INDEX "project_invitations_projectId_email_status_idx" ON "project_invitations"("projectId", "email", "status");

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_publicToken_key" ON "milestones"("publicToken");

-- CreateIndex
CREATE INDEX "milestones_projectId_idx" ON "milestones"("projectId");

-- CreateIndex
CREATE INDEX "milestones_assignedDeveloperId_idx" ON "milestones"("assignedDeveloperId");

-- CreateIndex
CREATE INDEX "milestones_publicToken_idx" ON "milestones"("publicToken");

-- CreateIndex
CREATE INDEX "milestone_approvals_milestoneId_idx" ON "milestone_approvals"("milestoneId");

-- CreateIndex
CREATE INDEX "evidence_milestoneId_idx" ON "evidence"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_results_milestoneId_key" ON "verification_results"("milestoneId");

-- CreateIndex
CREATE INDEX "verification_results_milestoneId_idx" ON "verification_results"("milestoneId");

-- CreateIndex
CREATE INDEX "ai_analyses_verificationResultId_idx" ON "ai_analyses"("verificationResultId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paypalInvoiceId_key" ON "payments"("paypalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payments_referenceId_key" ON "payments"("referenceId");

-- CreateIndex
CREATE INDEX "payments_milestoneId_idx" ON "payments"("milestoneId");

-- CreateIndex
CREATE INDEX "payments_referenceId_idx" ON "payments"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_milestoneId_invoiceVersion_key" ON "payments"("milestoneId", "invoiceVersion");

-- CreateIndex
CREATE UNIQUE INDEX "payment_captures_paypal_capture_id_key" ON "payment_captures"("paypal_capture_id");

-- CreateIndex
CREATE INDEX "payment_captures_payment_id_idx" ON "payment_captures"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_captures_payment_id_id_key" ON "payment_captures"("payment_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_paypal_refund_id_key" ON "payment_refunds"("paypal_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_idempotency_key_key" ON "payment_refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_id_idx" ON "payment_refunds"("payment_id");

-- CreateIndex
CREATE INDEX "payment_refunds_capture_id_idx" ON "payment_refunds"("capture_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_records_provider_item_id_key" ON "payout_records"("provider_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payout_records_idempotency_key_key" ON "payout_records"("idempotency_key");

-- CreateIndex
CREATE INDEX "payout_records_payment_id_idx" ON "payout_records"("payment_id");

-- CreateIndex
CREATE INDEX "payout_records_admin_user_id_idx" ON "payout_records"("admin_user_id");

-- CreateIndex
CREATE INDEX "webhook_events_resourceId_idx" ON "webhook_events"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "activity_logs_projectId_createdAt_idx" ON "activity_logs"("projectId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_exchange_codes" ADD CONSTRAINT "oauth_exchange_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_linking_challenges" ADD CONSTRAINT "account_linking_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_leadDeveloperId_fkey" FOREIGN KEY ("leadDeveloperId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_assignedDeveloperId_fkey" FOREIGN KEY ("assignedDeveloperId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_approvals" ADD CONSTRAINT "milestone_approvals_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_approvals" ADD CONSTRAINT "milestone_approvals_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_verificationResultId_fkey" FOREIGN KEY ("verificationResultId") REFERENCES "verification_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_captures" ADD CONSTRAINT "payment_captures_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_capture_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "payment_captures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

