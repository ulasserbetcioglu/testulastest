/*
  # Update inventory RLS policies
  
  1. Changes
    - Add admin access to all inventory operations
    - Allow operators to manage their own inventory
    - Update policies for inventory items and transactions
    
  2. Security
    - Maintain proper access control
    - Enable inventory management for operators
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable operator transaction creation" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable operator transaction viewing" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable operator item viewing" ON inventory_items;
DROP POLICY IF EXISTS "Enable operator item updates" ON inventory_items;

-- Create new policies for inventory_transactions
CREATE POLICY "Enable operator transaction creation"
ON inventory_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    WHERE o.auth_id = auth.uid()
  )
);

CREATE POLICY "Enable operator transaction viewing"
ON inventory_transactions
FOR SELECT
TO authenticated
USING (true);

-- Create new policies for inventory_items
CREATE POLICY "Enable operator item viewing"
ON inventory_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable operator item updates"
ON inventory_items
FOR UPDATE
TO authenticated
USING (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    INNER JOIN inventory_warehouses w ON w.operator_id = o.id
    WHERE o.auth_id = auth.uid()
    AND warehouse_id = w.id
  )
)
WITH CHECK (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    INNER JOIN inventory_warehouses w ON w.operator_id = o.id
    WHERE o.auth_id = auth.uid()
    AND warehouse_id = w.id
  )
);