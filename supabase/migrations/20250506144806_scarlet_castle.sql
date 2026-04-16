/*
  # Update customers table schema
  
  1. Changes
    - Remove cari_no column
    - Add musteri_no column with 6-digit auto-generated number
    - Add trigger to auto-generate musteri_no
    
  2. Security
    - Maintain existing RLS policies
*/

-- Create sequence for customer numbers
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 100000;

-- Add new column and remove old one
ALTER TABLE customers 
  ADD COLUMN musteri_no TEXT UNIQUE;

-- Create function to generate formatted customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.musteri_no := LPAD(nextval('customer_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate customer number
CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_number();

-- Update existing customers with new numbers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM customers WHERE musteri_no IS NULL ORDER BY created_at
  LOOP
    UPDATE customers 
    SET musteri_no = LPAD(nextval('customer_number_seq')::TEXT, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- Make musteri_no NOT NULL after updating existing records
ALTER TABLE customers 
  ALTER COLUMN musteri_no SET NOT NULL,
  DROP COLUMN IF EXISTS cari_no;