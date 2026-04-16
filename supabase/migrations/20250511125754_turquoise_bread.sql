/*
  # Update offers table structure
  
  1. Changes
    - Add offer_number field
    - Add offer_date and validity_date fields
    - Add total_amount field
    - Add status field with proper constraints
    
  2. Security
    - Maintain existing RLS policies
*/

-- Update offers table with new fields
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS offer_number text,
  ADD COLUMN IF NOT EXISTS offer_date timestamptz,
  ADD COLUMN IF NOT EXISTS validity_date timestamptz,
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add constraint for status
ALTER TABLE offers
  DROP CONSTRAINT IF EXISTS offers_status_check;

ALTER TABLE offers
  ADD CONSTRAINT offers_status_check 
  CHECK (status IN ('draft', 'pending', 'accepted', 'rejected', 'invoiced'));

-- Create function to generate offer number
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.offer_number := 'TEK-' || to_char(CURRENT_DATE, 'YYYYMM') || 
                     LPAD(nextval('offer_number_seq')::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for offer numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS offer_number_seq START 1;

-- Create trigger to auto-generate offer number
DROP TRIGGER IF EXISTS set_offer_number ON offers;
CREATE TRIGGER set_offer_number
  BEFORE INSERT ON offers
  FOR EACH ROW
  WHEN (NEW.offer_number IS NULL)
  EXECUTE FUNCTION generate_offer_number();

-- Update existing offers with offer_number if null
UPDATE offers
SET offer_number = 'TEK-' || to_char(created_at, 'YYYYMM') || 
                  LPAD(id::text, 3, '0')
WHERE offer_number IS NULL;

-- Make offer_number NOT NULL after updating existing records
ALTER TABLE offers
  ALTER COLUMN offer_number SET NOT NULL;