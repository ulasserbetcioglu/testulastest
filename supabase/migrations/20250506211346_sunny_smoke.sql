/*
  # Add paid products table

  1. New Tables
    - `paid_products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (numeric)
      - `unit_type` (text)
      - `is_active` (boolean)
      - `order_no` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

CREATE TABLE IF NOT EXISTS paid_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  unit_type text,
  is_active boolean DEFAULT true,
  order_no integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE paid_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON paid_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON paid_products
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON paid_products
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON paid_products
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE INDEX IF NOT EXISTS paid_products_order_no_idx ON paid_products (order_no);