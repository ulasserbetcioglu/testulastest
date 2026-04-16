/*
  # Update checklist RLS policies for admin access
  
  1. Changes
    - Add admin access to all checklist-related tables
    - Maintain existing operator access
    - Update policies to check for admin email
    
  2. Security
    - Keep existing RLS enabled
    - Add admin-specific policies
*/

-- Update checklist policies
DROP POLICY IF EXISTS "Users can read own checklists" ON checklists;
CREATE POLICY "Users can read own checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (auth.uid() = operator_id OR auth.email() = 'admin@ilaclamatik.com');

DROP POLICY IF EXISTS "Users can insert own checklists" ON checklists;
CREATE POLICY "Users can insert own checklists"
  ON checklists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = operator_id OR auth.email() = 'admin@ilaclamatik.com');

DROP POLICY IF EXISTS "Users can update own checklists" ON checklists;
CREATE POLICY "Users can update own checklists"
  ON checklists FOR UPDATE
  TO authenticated
  USING (auth.uid() = operator_id OR auth.email() = 'admin@ilaclamatik.com');

DROP POLICY IF EXISTS "Users can delete own checklists" ON checklists;
CREATE POLICY "Users can delete own checklists"
  ON checklists FOR DELETE
  TO authenticated
  USING (auth.uid() = operator_id OR auth.email() = 'admin@ilaclamatik.com');

-- Update checklist_equipments policies
DROP POLICY IF EXISTS "Users can read own checklist equipments" ON checklist_equipments;
CREATE POLICY "Users can read own checklist equipments"
  ON checklist_equipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_equipments.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can insert own checklist equipments" ON checklist_equipments;
CREATE POLICY "Users can insert own checklist equipments"
  ON checklist_equipments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_equipments.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can update own checklist equipments" ON checklist_equipments;
CREATE POLICY "Users can update own checklist equipments"
  ON checklist_equipments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_equipments.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can delete own checklist equipments" ON checklist_equipments;
CREATE POLICY "Users can delete own checklist equipments"
  ON checklist_equipments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_equipments.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

-- Update checklist_pests policies
DROP POLICY IF EXISTS "Users can read own checklist pests" ON checklist_pests;
CREATE POLICY "Users can read own checklist pests"
  ON checklist_pests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_pests.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can insert own checklist pests" ON checklist_pests;
CREATE POLICY "Users can insert own checklist pests"
  ON checklist_pests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_pests.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can update own checklist pests" ON checklist_pests;
CREATE POLICY "Users can update own checklist pests"
  ON checklist_pests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_pests.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can delete own checklist pests" ON checklist_pests;
CREATE POLICY "Users can delete own checklist pests"
  ON checklist_pests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_pests.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

-- Update checklist_products policies
DROP POLICY IF EXISTS "Users can read own checklist products" ON checklist_products;
CREATE POLICY "Users can read own checklist products"
  ON checklist_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_products.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can insert own checklist products" ON checklist_products;
CREATE POLICY "Users can insert own checklist products"
  ON checklist_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_products.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can update own checklist products" ON checklist_products;
CREATE POLICY "Users can update own checklist products"
  ON checklist_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_products.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );

DROP POLICY IF EXISTS "Users can delete own checklist products" ON checklist_products;
CREATE POLICY "Users can delete own checklist products"
  ON checklist_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM checklists
      WHERE checklists.id = checklist_products.checklist_id
      AND (checklists.operator_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com')
    )
  );