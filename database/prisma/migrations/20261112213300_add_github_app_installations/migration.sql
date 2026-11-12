-- CreateEnum
CREATE TYPE "GitHubInstallationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'UNINSTALLED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "githubInstallationRecordId" TEXT;

-- CreateTable
CREATE TABLE "github_app_installations" (
    "id" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "repositorySelection" TEXT NOT NULL DEFAULT 'selected',
    "status" "GitHubInstallationStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissionsSnapshot" JSONB,
    "suspendedAt" TIMESTAMP(3),
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_app_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_authorized_repos" (
    "id" TEXT NOT NULL,
    "installationRecordId" TEXT NOT NULL,
    "githubRepoId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_authorized_repos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_app_installations_installationId_key" ON "github_app_installations"("installationId");

-- CreateIndex
CREATE INDEX "github_app_installations_userId_status_idx" ON "github_app_installations"("userId", "status");

-- CreateIndex
CREATE INDEX "github_app_installations_accountId_idx" ON "github_app_installations"("accountId");

-- CreateIndex
CREATE INDEX "github_authorized_repos_installationRecordId_fullName_idx" ON "github_authorized_repos"("installationRecordId", "fullName");

-- CreateIndex
CREATE INDEX "github_authorized_repos_fullName_idx" ON "github_authorized_repos"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "github_authorized_repos_installationRecordId_githubRepoId_key" ON "github_authorized_repos"("installationRecordId", "githubRepoId");

-- CreateIndex
CREATE INDEX "projects_githubInstallationRecordId_idx" ON "projects"("githubInstallationRecordId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_githubInstallationRecordId_fkey" FOREIGN KEY ("githubInstallationRecordId") REFERENCES "github_app_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_app_installations" ADD CONSTRAINT "github_app_installations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_authorized_repos" ADD CONSTRAINT "github_authorized_repos_installationRecordId_fkey" FOREIGN KEY ("installationRecordId") REFERENCES "github_app_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

