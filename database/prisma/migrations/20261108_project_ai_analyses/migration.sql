-- AlterTable
ALTER TABLE "ai_analyses" ALTER COLUMN "verificationResultId" DROP NOT NULL;
ALTER TABLE "ai_analyses" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE INDEX "ai_analyses_projectId_idx" ON "ai_analyses"("projectId");

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

