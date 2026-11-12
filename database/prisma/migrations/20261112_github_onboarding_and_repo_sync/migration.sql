-- Non-destructive migration for Developer GitHub onboarding, authenticated repo connect, and webhook/sync metadata

ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'GITHUB_REPO_CONNECTED';
ALTER TYPE "ActivityAction" ADD VALUE IF NOT EXISTS 'GITHUB_REPO_SYNCED';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "githubUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "githubConnectedAt" TIMESTAMP(3);

ALTER TABLE "oauth_states"
  ADD COLUMN IF NOT EXISTS "initiatingUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "purpose" TEXT DEFAULT 'LOGIN',
  ADD COLUMN IF NOT EXISTS "returnPath" TEXT;

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "githubDefaultBranch" TEXT,
  ADD COLUMN IF NOT EXISTS "githubVisibility" TEXT,
  ADD COLUMN IF NOT EXISTS "githubSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "githubSyncStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "githubSyncError" TEXT,
  ADD COLUMN IF NOT EXISTS "githubLastCommitSha" TEXT,
  ADD COLUMN IF NOT EXISTS "githubLastCommitMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "githubLastCommitAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "githubCachedData" JSONB;

CREATE INDEX IF NOT EXISTS "projects_githubRepoOwner_githubRepoName_idx"
  ON "projects"("githubRepoOwner", "githubRepoName");

