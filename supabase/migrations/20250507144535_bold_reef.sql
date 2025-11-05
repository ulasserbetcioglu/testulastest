-- Drop existing policies
DROP POLICY IF EXISTS "Enable full access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable read access for operators" ON inventory_warehouses;

-- Create new policies
CREATE POLICY "Enable full access for admin"
ON inventory_warehouses
FOR ALL
TO authenticated
USING (auth.email() = 'admin@ilaclamatik.com'::text)
WITH CHECK (auth.email() = 'admin@ilaclamatik.com'::text);

-- Allow operators to read warehouses they should have access to
CREATE POLICY "Enable read access for operators"
ON inventory_warehouses
FOR SELECT
TO authenticated
USING (
  -- Allow access to main warehouse
  type = 'main' OR
  -- Allow access to operator's own warehouse
  (type = 'operator' AND operator_id IN (
    SELECT id FROM operators WHERE auth_id = auth.uid()
  )) OR
  -- Allow access to branch warehouses
  (type = 'branch' AND EXISTS (
    SELECT 1 
    FROM operators 
    WHERE operators.auth_id = auth.uid()
  ))
);