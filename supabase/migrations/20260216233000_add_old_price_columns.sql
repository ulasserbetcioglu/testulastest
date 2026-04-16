ALTER TABLE customer_pricing ADD COLUMN IF NOT EXISTS old_monthly_price NUMERIC;
ALTER TABLE customer_pricing ADD COLUMN IF NOT EXISTS old_per_visit_price NUMERIC;

ALTER TABLE branch_pricing ADD COLUMN IF NOT EXISTS old_monthly_price NUMERIC;
ALTER TABLE branch_pricing ADD COLUMN IF NOT EXISTS old_per_visit_price NUMERIC;
