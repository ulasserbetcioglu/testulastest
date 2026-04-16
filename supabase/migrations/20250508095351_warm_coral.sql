-- First, ensure RLS is enabled
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable update access for admin" ON inventory_items;
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