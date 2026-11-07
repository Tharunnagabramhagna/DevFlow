-- database/prisma/migrations/20261107_counterparty_separation_check/migration.sql
ALTER TABLE projects 
ADD CONSTRAINT check_counterparty_separation 
CHECK ("clientId" IS NULL OR "leadDeveloperId" IS NULL OR "clientId" <> "leadDeveloperId");

