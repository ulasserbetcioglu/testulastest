-- Add auto_reconciliation to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reconciliation boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reconciliation_day integer DEFAULT 5;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reconciliation_period text DEFAULT 'previous_month';

-- Create an index for performance when fetching auto-reconciliation customers
CREATE INDEX IF NOT EXISTS idx_customers_auto_reconciliation ON customers(auto_reconciliation) WHERE auto_reconciliation = true;
