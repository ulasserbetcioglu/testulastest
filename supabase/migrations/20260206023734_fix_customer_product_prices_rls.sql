/*
  # Fix RLS policies for customer_product_prices

  1. Changes
    - Drop existing overly restrictive policies that require auth.uid()
    - Add public-level policies matching the app's anon-key access pattern
    - Separate policies for SELECT, INSERT, UPDATE, DELETE

  2. Security
    - Policies aligned with the app's existing access pattern (anon key)
    - Matches how other tables (customers, visits, etc.) are configured
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_product_prices' 
    AND policyname = 'Admin can manage customer product prices'
  ) THEN
    DROP POLICY "Admin can manage customer product prices" ON customer_product_prices;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_product_prices' 
    AND policyname = 'Users can read customer product prices'
  ) THEN
    DROP POLICY "Users can read customer product prices" ON customer_product_prices;
  END IF;
END $$;

CREATE POLICY "Allow public select on customer_product_prices"
  ON customer_product_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on customer_product_prices"
  ON customer_product_prices
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update on customer_product_prices"
  ON customer_product_prices
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on customer_product_prices"
  ON customer_product_prices
  FOR DELETE
  TO anon, authenticated
  USING (true);