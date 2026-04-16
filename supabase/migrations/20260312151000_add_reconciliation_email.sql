-- Migration to add reconciliation_email to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reconciliation_email text;
