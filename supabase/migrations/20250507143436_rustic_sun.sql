/*
  # Update warehouse RLS policies
  
  1. Changes
    - Drop existing policies
    - Add admin full access policy
    - Add operator read access policy
    
  2. Security
    - Admin has full access
    - Operators can access:
      - Main warehouse
      - Their own operator warehouse
      - Their branch warehouse
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable insert access for admin" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_warehouses;
DROP POLICY IF EXISTS "Enable update access for admin" ON inventory_warehouses;

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
  type = 'main'
  -- Allow access to operator's own warehouse
  OR (
    type = 'operator' 
    AND operator_id IN (
      SELECT id FROM operators WHERE auth_id = auth.uid()
    )
  )
  -- Allow access to operator's branch warehouse
  OR (
    type = 'branch'
    AND branch_id IN (
      SELECT branch_id FROM operators WHERE auth_id = auth.uid()
    )
  )
);