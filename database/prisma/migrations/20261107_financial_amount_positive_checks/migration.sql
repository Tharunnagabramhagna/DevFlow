-- database/prisma/migrations/20261107_financial_amount_positive_checks/migration.sql
ALTER TABLE payments 
ADD CONSTRAINT check_payment_positive_amounts 
CHECK ("snapshotAmount" > 0 AND "settledAmount" >= 0 AND "feeAmount" >= 0 AND "netReceivedAmount" >= 0 AND "refundedAmount" >= 0);

ALTER TABLE payment_captures 
ADD CONSTRAINT check_capture_positive_amounts 
CHECK (gross_amount > 0 AND (fee_amount IS NULL OR fee_amount >= 0) AND (net_amount IS NULL OR net_amount >= 0));

ALTER TABLE payment_refunds 
ADD CONSTRAINT check_refund_positive_amounts 
CHECK (gross_amount > 0 AND (fee_reversal_amount IS NULL OR fee_reversal_amount >= 0) AND (net_deducted_amount IS NULL OR net_deducted_amount >= 0));

ALTER TABLE payout_records 
ADD CONSTRAINT check_payout_positive_amount 
CHECK (amount > 0);

