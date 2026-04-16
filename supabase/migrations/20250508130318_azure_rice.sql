-- Drop existing policies
DROP POLICY IF EXISTS "Enable full access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable read access for operators" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable operator transaction creation" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable operator transaction viewing" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable operator item viewing" ON inventory_items;
DROP POLICY IF EXISTS "Enable operator item updates" ON inventory_items;

-- Create new policies for inventory_warehouses
CREATE POLICY "Enable full access for admin"
ON inventory_warehouses
FOR ALL
TO authenticated
USING (auth.email() = 'admin@ilaclamatik.com')
WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Allow all authenticated users to read warehouses
CREATE POLICY "Enable read access for authenticated users"
ON inventory_warehouses
FOR SELECT
TO authenticated
USING (true);

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