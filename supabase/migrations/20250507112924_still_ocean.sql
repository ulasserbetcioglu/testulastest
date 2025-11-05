/*
  # Create inventory warehouses table
  
  1. New Tables
    - `inventory_warehouses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text: main, branch, operator)
      - `branch_id` (uuid, foreign key to branches)
      - `operator_id` (uuid, foreign key to operators)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Constraints
    - Only one type of relationship can exist (main, branch, or operator)
    - Foreign key constraints to branches and operators
  
  3. Security
    - Enable RLS
    - Admin-only policies for insert/update/delete
    - Read access for all authenticated users
*/

-- Create inventory_warehouses table
CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('main', 'branch', 'operator')),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure only one type of relationship exists
  CONSTRAINT warehouse_owner_check CHECK (
    (type = 'main' AND branch_id IS NULL AND operator_id IS NULL) OR
    (type = 'branch' AND branch_id IS NOT NULL AND operator_id IS NULL) OR
    (type = 'operator' AND branch_id IS NULL AND operator_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS inventory_warehouses_type_idx ON inventory_warehouses(type);
CREATE INDEX IF NOT EXISTS inventory_warehouses_branch_id_idx ON inventory_warehouses(branch_id);
CREATE INDEX IF NOT EXISTS inventory_warehouses_operator_id_idx ON inventory_warehouses(operator_id);

-- Enable RLS
ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable delete access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable insert access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable update access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_warehouses;

-- Policies for admin
CREATE POLICY "Enable delete access for admin"
  ON inventory_warehouses
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable insert access for admin"
  ON inventory_warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin"
  ON inventory_warehouses
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Policy for read access
CREATE POLICY "Enable read access for authenticated users"
  ON inventory_warehouses
  FOR SELECT
  TO authenticated
  USING (true);