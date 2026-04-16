/*
  # Add customer and branch pricing tables
  
  1. New Tables
    - `customer_pricing`: Store pricing information for customers
    - `branch_pricing`: Store pricing information for branches
    
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create customer pricing table
CREATE TABLE IF NOT EXISTS customer_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  monthly_price numeric,
  per_visit_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customer_pricing_customer_id_key UNIQUE (customer_id),
  CONSTRAINT customer_pricing_price_check CHECK (
    (monthly_price IS NOT NULL AND per_visit_price IS NULL) OR
    (monthly_price IS NULL AND per_visit_price IS NOT NULL)
  )
);

-- Create branch pricing table
CREATE TABLE IF NOT EXISTS branch_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  monthly_price numeric,
  per_visit_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT branch_pricing_branch_id_key UNIQUE (branch_id),
  CONSTRAINT branch_pricing_price_check CHECK (
    (monthly_price IS NOT NULL AND per_visit_price IS NULL) OR
    (monthly_price IS NULL AND per_visit_price IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE customer_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_pricing
CREATE POLICY "Enable read access for authenticated users" ON customer_pricing
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON customer_pricing
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON customer_pricing
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON customer_pricing
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for branch_pricing
CREATE POLICY "Enable read access for authenticated users" ON branch_pricing
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON branch_pricing
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON branch_pricing
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON branch_pricing
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS customer_pricing_customer_id_idx ON customer_pricing(customer_id);
CREATE INDEX IF NOT EXISTS branch_pricing_branch_id_idx ON branch_pricing(branch_id);