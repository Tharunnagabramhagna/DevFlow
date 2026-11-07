-- database/prisma/migrations/20261107_active_invoice_constraint/migration.sql
CREATE UNIQUE INDEX active_milestone_invoice_idx 
ON payments ("milestoneId") 
WHERE status IN (
  'CREATING'::"PaymentStatus", 
  'DRAFT'::"PaymentStatus", 
  'SCHEDULED'::"PaymentStatus", 
  'SENDING'::"PaymentStatus", 
  'SENT'::"PaymentStatus", 
  'PAID'::"PaymentStatus", 
  'PAYMENT_PENDING'::"PaymentStatus", 
  'PARTIALLY_PAID'::"PaymentStatus", 
  'PARTIALLY_REFUNDED'::"PaymentStatus", 
  'MANUAL_RECONCILIATION_REQUIRED'::"PaymentStatus"
);

