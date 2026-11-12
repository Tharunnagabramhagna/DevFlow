-- CreateEnum
CREATE TYPE "ResumeParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'MARKETPLACE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "DeveloperAvailability" AS ENUM ('AVAILABLE_NOW', 'OPEN_TO_OFFERS', 'PART_TIME', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('SELF_DECLARED', 'RESUME_EXTRACTED', 'GITHUB_OBSERVED');

-- CreateEnum
CREATE TYPE "OpportunityVisibility" AS ENUM ('PRIVATE', 'DISCOVERABLE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SkillRequirementLevel" AS ENUM ('MANDATORY', 'PREFERRED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OPPORTUNITY_APPLIED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STATUS_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'TALENT_INVITATION';

-- CreateTable
CREATE TABLE "developer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "yearsOfExperience" INTEGER,
    "availability" "DeveloperAvailability" NOT NULL DEFAULT 'OPEN_TO_OFFERS',
    "hourlyRateMin" DECIMAL(10,2),
    "hourlyRateMax" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "location" TEXT,
    "timezone" TEXT,
    "portfolioUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubProfileUrl" TEXT,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "shareContactEmail" BOOLEAN NOT NULL DEFAULT false,
    "shareGitHubRepos" BOOLEAN NOT NULL DEFAULT true,
    "allowClientResumeDownload" BOOLEAN NOT NULL DEFAULT false,
    "activeResumeId" TEXT,
    "selectedTemplateId" TEXT NOT NULL DEFAULT 'software-engineer',
    "templateDraftJson" JSONB,
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_resumes" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "parseStatus" "ResumeParseStatus" NOT NULL DEFAULT 'PENDING',
    "parseError" TEXT,
    "parserMethod" TEXT,
    "aiModelName" TEXT,
    "extractionConfidence" INTEGER NOT NULL DEFAULT 0,
    "lowConfidenceFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extractedTextExcerpt" TEXT,
    "extractedData" JSONB,
    "approvedData" JSONB,
    "reviewedByDeveloper" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_files" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "detectedMimeType" TEXT NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "fileExtension" VARCHAR(16) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_skills" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "source" "SkillSource" NOT NULL DEFAULT 'SELF_DECLARED',
    "yearsUsed" INTEGER,
    "proficiency" TEXT,
    "confidence" INTEGER,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "sourceExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT,
    "summary" TEXT NOT NULL,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectUrl" TEXT,
    "repoFullName" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_opportunities" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "linkedProjectId" TEXT,
    "title" TEXT NOT NULL,
    "organizationName" TEXT,
    "description" TEXT NOT NULL,
    "deliverablesSummary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiEnhancedDescription" TEXT,
    "aiApprovedByClient" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "OpportunityVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "experienceLevel" TEXT,
    "minYearsExperience" INTEGER,
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "expectedDuration" TEXT,
    "locationPreference" TEXT,
    "timezonePreference" TEXT,
    "applicationDeadline" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_skills" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "requirementLevel" "SkillRequirementLevel" NOT NULL DEFAULT 'MANDATORY',

    CONSTRAINT "opportunity_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_applications" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "profileId" TEXT,
    "resumeId" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "proposal" TEXT NOT NULL,
    "proposedBudget" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "estimatedTimeline" TEXT,
    "selectedPortfolioIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowResumeDownload" BOOLEAN NOT NULL DEFAULT false,
    "clientNotes" TEXT,
    "matchScoreSnapshot" INTEGER,
    "matchSummarySnapshot" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_match_results" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "profileId" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "matchScore" INTEGER,
    "insufficientData" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT NOT NULL,
    "matchedSkills" JSONB NOT NULL DEFAULT '[]',
    "missingSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiModelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_match_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_userId_key" ON "developer_profiles"("userId");

-- CreateIndex
CREATE INDEX "developer_profiles_visibility_availability_idx" ON "developer_profiles"("visibility", "availability");

-- CreateIndex
CREATE INDEX "developer_resumes_userId_createdAt_idx" ON "developer_resumes"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "developer_resumes_profileId_isPrimary_idx" ON "developer_resumes"("profileId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "resume_files_resumeId_key" ON "resume_files"("resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "resume_files_storageKey_key" ON "resume_files"("storageKey");

-- CreateIndex
CREATE INDEX "resume_files_userId_sha256Hash_idx" ON "resume_files"("userId", "sha256Hash");

-- CreateIndex
CREATE INDEX "developer_skills_normalizedName_idx" ON "developer_skills"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "developer_skills_profileId_normalizedName_source_key" ON "developer_skills"("profileId", "normalizedName", "source");

-- CreateIndex
CREATE INDEX "portfolio_projects_profileId_isPublic_idx" ON "portfolio_projects"("profileId", "isPublic");

-- CreateIndex
CREATE INDEX "marketplace_opportunities_clientId_status_idx" ON "marketplace_opportunities"("clientId", "status");

-- CreateIndex
CREATE INDEX "marketplace_opportunities_visibility_status_createdAt_idx" ON "marketplace_opportunities"("visibility", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "opportunity_skills_normalizedName_idx" ON "opportunity_skills"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_skills_opportunityId_normalizedName_key" ON "opportunity_skills"("opportunityId", "normalizedName");

-- CreateIndex
CREATE INDEX "opportunity_applications_developerId_status_idx" ON "opportunity_applications"("developerId", "status");

-- CreateIndex
CREATE INDEX "opportunity_applications_opportunityId_status_idx" ON "opportunity_applications"("opportunityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_applications_opportunityId_developerId_key" ON "opportunity_applications"("opportunityId", "developerId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_opportunities_userId_opportunityId_key" ON "saved_opportunities"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "talent_match_results_clientId_createdAt_idx" ON "talent_match_results"("clientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "talent_match_results_opportunityId_profileId_idx" ON "talent_match_results"("opportunityId", "profileId");

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_resumes" ADD CONSTRAINT "developer_resumes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_resumes" ADD CONSTRAINT "developer_resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_files" ADD CONSTRAINT "resume_files_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "developer_resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_files" ADD CONSTRAINT "resume_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_skills" ADD CONSTRAINT "developer_skills_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_opportunities" ADD CONSTRAINT "marketplace_opportunities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_opportunities" ADD CONSTRAINT "marketplace_opportunities_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_skills" ADD CONSTRAINT "opportunity_skills_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "marketplace_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "marketplace_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "developer_resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "marketplace_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_match_results" ADD CONSTRAINT "talent_match_results_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_match_results" ADD CONSTRAINT "talent_match_results_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "marketplace_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_match_results" ADD CONSTRAINT "talent_match_results_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

