-- database/prisma/migrations/20261107_unique_pending_invitation/migration.sql
CREATE UNIQUE INDEX unique_pending_project_invitation_idx 
ON project_invitations ("projectId", LOWER(email), role) 
WHERE status = 'PENDING'::"InvitationStatus";

