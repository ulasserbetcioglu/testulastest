/*
  # Add Customer Active/Passive Status and Customer-Specific Product Pricing

  1. Modified Tables
    - `customers`
      - `is_active` (boolean, default true) - Marks customer as active or inactive
        Active customers appear in all views; inactive customers are hidden from
        operational pages (calendar, visits, dropdowns) but remain accessible
        in the customer management list with a filter.

  2. New Tables
    - `customer_product_prices`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `product_id` (uuid, references paid_products)
      - `custom_price` (numeric, the customer-specific price for this product)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (customer_id, product_id) to prevent duplicates

  3. Security
    - Enable RLS on `customer_product_prices`
    - Admin can manage all records
    - Authenticated users can read records relevant to their customer

  4. Notes
    - Price resolution order: customer_product_prices.custom_price -> paid_products.price
    - Inactive customers retain all historical data; they just stop appearing in
      operational views
*/

-- Add is_active column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create customer_product_prices table
CREATE TABLE IF NOT EXISTS customer_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES paid_products(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL CHECK (custom_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customer_product_prices_unique UNIQUE (customer_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_product_prices_customer
  ON customer_product_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_product_prices_product
  ON customer_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active
  ON customers(is_active);

-- Enable RLS
ALTER TABLE customer_product_prices ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on customer_product_prices
CREATE POLICY "Admin can manage customer product prices"
  ON customer_product_prices
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@ilaclamatik.com'
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@ilaclamatik.com'
  );

-- Authenticated users can read customer product prices for their assigned customers
CREATE POLICY "Users can read customer product prices"
  ON customer_product_prices
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_id = auth.uid()
    )
    OR
    customer_id IN (
      SELECT unnest(assigned_customers::uuid[]) FROM operators WHERE auth_id = auth.uid()
    )
  );
