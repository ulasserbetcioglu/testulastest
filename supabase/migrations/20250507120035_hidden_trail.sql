/*
  # Create checklist related tables and policies
  
  1. New Tables
    - `checklists`: Main table for inspection reports
    - `checklist_equipments`: Equipment used during inspection
    - `checklist_pests`: Pests found during inspection
    - `checklist_products`: Products used during inspection
    
  2. Security
    - Enable RLS on all tables
    - Operators can only access their own checklists
    - Cascade deletions to maintain referential integrity
*/

-- Create checklists table
CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  report_number text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  humidity_level text NOT NULL,
  notes text,
  report_photo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can insert own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can update own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can delete own checklists" ON checklists;

-- Create policies for checklists
CREATE POLICY "Users can read own checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Users can insert own checklists"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Users can update own checklists"
  ON checklists FOR UPDATE
  TO authenticated
  USING (auth.uid() = operator_id);

CREATE POLICY "Users can delete own checklists"
  ON checklists FOR DELETE
  TO authenticated
  USING (auth.uid() = operator_id);

-- Create checklist_equipments table
CREATE TABLE IF NOT EXISTS checklist_equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES checklists(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  properties jsonb
);

ALTER TABLE checklist_equipments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can insert own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can update own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can delete own checklist equipments" ON checklist_equipments;

-- Create policies for checklist_equipments
CREATE POLICY "Users can read own checklist equipments"
  ON checklist_equipments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can insert own checklist equipments"
  ON checklist_equipments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can update own checklist equipments"
  ON checklist_equipments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can delete own checklist equipments"
  ON checklist_equipments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

-- Create checklist_pests table
CREATE TABLE IF NOT EXISTS checklist_pests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES checklists(id) ON DELETE CASCADE,
  pest_id uuid REFERENCES pests(id) ON DELETE CASCADE
);

ALTER TABLE checklist_pests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can insert own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can update own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can delete own checklist pests" ON checklist_pests;

-- Create policies for checklist_pests
CREATE POLICY "Users can read own checklist pests"
  ON checklist_pests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can insert own checklist pests"
  ON checklist_pests FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can update own checklist pests"
  ON checklist_pests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can delete own checklist pests"
  ON checklist_pests FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

-- Create checklist_products table
CREATE TABLE IF NOT EXISTS checklist_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES checklists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES biocidal_products(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  unit text NOT NULL
);

ALTER TABLE checklist_products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can insert own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can update own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can delete own checklist products" ON checklist_products;

-- Create policies for checklist_products
CREATE POLICY "Users can read own checklist products"
  ON checklist_products FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can insert own checklist products"
  ON checklist_products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can update own checklist products"
  ON checklist_products FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND checklists.operator_id = auth.uid()
  ));

CREATE POLICY "Users can delete own checklist products"
  ON checklist_products FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND checklists.operator_id = auth.uid()
  ));