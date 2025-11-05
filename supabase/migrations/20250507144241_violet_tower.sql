-- Drop existing policies
DROP POLICY IF EXISTS "Enable full access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable read access for operators" ON inventory_warehouses;

-- Create new policies
CREATE POLICY "Enable full access for admin"
ON inventory_warehouses
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.email() = 'admin@ilaclamatik.com'::text)
WITH CHECK (auth.email() = 'admin@ilaclamatik.com'::text);

CREATE POLICY "Enable read access for operators"
ON inventory_warehouses
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (type = 'main') OR 
  (type = 'operator' AND operator_id IN (
    SELECT operators.id 
    FROM operators 
    WHERE operators.auth_id = auth.uid()
  )) OR 
  (type = 'branch' AND branch_id IN (
    SELECT branches.id
    FROM operators
    JOIN branches ON true
    WHERE operators.auth_id = auth.uid()
  ))
);