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
CREATE TABLE IF NOT EXISTS warehouses (
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

-- Create warehouse items table
CREATE TABLE IF NOT EXISTS warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES paid_products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- Create warehouse transfers table
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  target_warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES paid_products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  transfer_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouses
CREATE POLICY "Enable read access for authenticated users" ON warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON warehouses
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON warehouses
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON warehouses
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for warehouse items
CREATE POLICY "Enable read access for authenticated users" ON warehouse_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON warehouse_items
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin and operators" ON warehouse_items
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

CREATE POLICY "Enable delete access for admin" ON warehouse_items
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for warehouse transfers
CREATE POLICY "Enable read access for authenticated users" ON warehouse_transfers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON warehouse_transfers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for admin" ON warehouse_transfers
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON warehouse_transfers
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create function to generate warehouse code
CREATE OR REPLACE FUNCTION generate_warehouse_code(operator_name text)
RETURNS text AS $$
BEGIN
  RETURN UPPER(
    REGEXP_REPLACE(
      SUBSTR(
        REGEXP_REPLACE(operator_name, '[^a-zA-Z0-9]', '', 'g'),
        1, 
        10
      ),
      '([A-Z0-9]{3})([A-Z0-9]*)',
      '\1-\2'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to handle automatic warehouse creation
CREATE OR REPLACE FUNCTION create_operator_warehouse()
RETURNS TRIGGER AS $$
BEGIN
  -- Create warehouse for the new operator
  INSERT INTO warehouses (
    name,
    code,
    operator_id,
    is_active
  ) VALUES (
    NEW.name || ' Deposu',
    generate_warehouse_code(NEW.name),
    NEW.id,
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS create_operator_warehouse_trigger ON operators;
CREATE TRIGGER create_operator_warehouse_trigger
  AFTER INSERT ON operators
  FOR EACH ROW
  EXECUTE FUNCTION create_operator_warehouse();

-- Create main warehouse if it doesn't exist
INSERT INTO warehouses (name, code, is_active)
SELECT 'Ana Depo', 'MAIN-DEPOT', true
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses WHERE code = 'MAIN-DEPOT'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS warehouse_items_warehouse_id_idx ON warehouse_items(warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_items_product_id_idx ON warehouse_items(product_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_source_warehouse_id_idx ON warehouse_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_target_warehouse_id_idx ON warehouse_transfers(target_warehouse_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_product_id_idx ON warehouse_transfers(product_id);
CREATE INDEX IF NOT EXISTS warehouse_transfers_status_idx ON warehouse_transfers(status);