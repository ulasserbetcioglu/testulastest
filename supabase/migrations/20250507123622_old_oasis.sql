/*
  # Map authentication users with database tables
  
  1. Changes
    - Add auth_id columns to operators, customers, and branches
    - Update existing records with matching auth users
    - Update checklists to use auth_id
    - Update RLS policies to use auth_id
    
  2. Security
    - Maintain data integrity during migration
    - Update policies before structure changes
*/

-- Add auth_id column to operators table
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Add auth_id column to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Add auth_id column to branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Update operators with matching auth users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, email FROM operators
  LOOP
    UPDATE operators
    SET auth_id = (
      SELECT id FROM auth.users 
      WHERE email = r.email
      LIMIT 1
    )
    WHERE id = r.id;
  END LOOP;
END $$;

-- Update customers with matching auth users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, email FROM customers
    WHERE email IS NOT NULL
  LOOP
    UPDATE customers
    SET auth_id = (
      SELECT id FROM auth.users 
      WHERE email = r.email
      LIMIT 1
    )
    WHERE id = r.id;
  END LOOP;
END $$;

-- Update branches with matching auth users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, email FROM branches
    WHERE email IS NOT NULL
  LOOP
    UPDATE branches
    SET auth_id = (
      SELECT id FROM auth.users 
      WHERE email = r.email
      LIMIT 1
    )
    WHERE id = r.id;
  END LOOP;
END $$;

-- Add auth_id to checklists
ALTER TABLE checklists
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Update existing checklists with operator's auth_id
UPDATE checklists c
SET auth_id = o.auth_id
FROM operators o
WHERE c.operator_id = o.id;

-- Drop existing policies that depend on operator_id
DROP POLICY IF EXISTS "Users can read own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can insert own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can update own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can delete own checklists" ON checklists;

DROP POLICY IF EXISTS "Users can read own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can insert own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can update own checklist equipments" ON checklist_equipments;
DROP POLICY IF EXISTS "Users can delete own checklist equipments" ON checklist_equipments;

DROP POLICY IF EXISTS "Users can read own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can insert own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can update own checklist pests" ON checklist_pests;
DROP POLICY IF EXISTS "Users can delete own checklist pests" ON checklist_pests;

DROP POLICY IF EXISTS "Users can read own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can insert own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can update own checklist products" ON checklist_products;
DROP POLICY IF EXISTS "Users can delete own checklist products" ON checklist_products;

-- Now we can safely drop the operator_id column
ALTER TABLE checklists
  DROP COLUMN IF EXISTS operator_id;

-- Create new policies using auth_id
CREATE POLICY "Users can read own checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Users can insert own checklists"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Users can update own checklists"
  ON checklists FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Users can delete own checklists"
  ON checklists FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_id OR auth.email() = 'admin@ilaclamatik.com');

-- Create new policies for checklist_equipments
CREATE POLICY "Users can read own checklist equipments"
  ON checklist_equipments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can insert own checklist equipments"
  ON checklist_equipments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can update own checklist equipments"
  ON checklist_equipments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can delete own checklist equipments"
  ON checklist_equipments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_equipments.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

-- Create new policies for checklist_pests
CREATE POLICY "Users can read own checklist pests"
  ON checklist_pests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can insert own checklist pests"
  ON checklist_pests FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can update own checklist pests"
  ON checklist_pests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can delete own checklist pests"
  ON checklist_pests FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_pests.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

-- Create new policies for checklist_products
CREATE POLICY "Users can read own checklist products"
  ON checklist_products FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can insert own checklist products"
  ON checklist_products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can update own checklist products"
  ON checklist_products FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));

CREATE POLICY "Users can delete own checklist products"
  ON checklist_products FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklists
    WHERE checklists.id = checklist_products.checklist_id
    AND (checklists.auth_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
  ));