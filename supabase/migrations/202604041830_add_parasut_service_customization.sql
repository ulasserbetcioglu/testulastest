-- Add Paraşüt service customization fields to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS parasut_service_id text,
  ADD COLUMN IF NOT EXISTS parasut_service_name text;

-- Add comments for clarity
COMMENT ON COLUMN customers.parasut_service_id IS 'Specific Paraşüt Product ID for service items (if different from default)';
COMMENT ON COLUMN customers.parasut_service_name IS 'Specific text name for service items in Paraşüt invoices (if different from default)';
