/*
  # Add inventory management tables

  1. New Tables
    - `inventory_items`
      - Track inventory items with stock levels
    - `inventory_transactions`
      - Track inventory movements
    - `inventory_warehouses`
      - Define warehouse locations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create inventory warehouses table
CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('main', 'branch', 'operator')),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT warehouse_owner_check CHECK (
    (type = 'main' AND branch_id IS NULL AND operator_id IS NULL) OR
    (type = 'branch' AND branch_id IS NOT NULL AND operator_id IS NULL) OR
    (type = 'operator' AND branch_id IS NULL AND operator_id IS NOT NULL)
  )
);

ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON inventory_warehouses
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON inventory_warehouses
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON inventory_warehouses
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  max_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, code)
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON inventory_items
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON inventory_items
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON inventory_items
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  source_warehouse_id uuid REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  target_warehouse_id uuid REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('transfer', 'adjustment', 'consumption')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON inventory_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX inventory_items_warehouse_id_idx ON inventory_items(warehouse_id);
CREATE INDEX inventory_items_code_idx ON inventory_items(code);
CREATE INDEX inventory_items_category_idx ON inventory_items(category);

CREATE INDEX inventory_transactions_item_id_idx ON inventory_transactions(item_id);
CREATE INDEX inventory_transactions_source_warehouse_id_idx ON inventory_transactions(source_warehouse_id);
CREATE INDEX inventory_transactions_target_warehouse_id_idx ON inventory_transactions(target_warehouse_id);
CREATE INDEX inventory_transactions_created_by_idx ON inventory_transactions(created_by);