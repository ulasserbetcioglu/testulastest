/*
  # Create warehouse management tables
  
  1. New Tables
    - `warehouses`: Store warehouse information
    - `warehouse_items`: Track items in warehouses
    - `warehouse_transfers`: Track transfers between warehouses
    
  2. Security
    - Enable RLS
    - Add policies for admin and operators
*/

-- Create warehouses table
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text,
  city text,
  is_active boolean DEFAULT true,
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Create warehouse items table
CREATE TABLE warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES paid_products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

ALTER TABLE warehouse_items ENABLE ROW LEVEL SECURITY;

-- Create warehouse transfers table
CREATE TABLE warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  target_warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES paid_products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  transfer_date timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouses
CREATE POLICY "Enable read access for authenticated users" ON warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable full access for admin" ON warehouses
  FOR ALL TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com')
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for warehouse items
CREATE POLICY "Enable read access for authenticated users" ON warehouse_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update for admin and operators" ON warehouse_items
  FOR UPDATE TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM warehouses w
      WHERE w.id = warehouse_items.warehouse_id
      AND w.operator_id IN (
        SELECT id FROM operators WHERE auth_id = auth.uid()
      )
    )
  );

-- Create policies for warehouse transfers
CREATE POLICY "Enable read access for authenticated users" ON warehouse_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for admin and operators" ON warehouse_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable update for admin" ON warehouse_transfers
  FOR UPDATE TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com')
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX warehouse_items_warehouse_id_idx ON warehouse_items(warehouse_id);
CREATE INDEX warehouse_items_product_id_idx ON warehouse_items(product_id);
CREATE INDEX warehouse_transfers_source_warehouse_id_idx ON warehouse_transfers(source_warehouse_id);
CREATE INDEX warehouse_transfers_target_warehouse_id_idx ON warehouse_transfers(target_warehouse_id);
CREATE INDEX warehouse_transfers_product_id_idx ON warehouse_transfers(product_id);
CREATE INDEX warehouse_transfers_status_idx ON warehouse_transfers(status);