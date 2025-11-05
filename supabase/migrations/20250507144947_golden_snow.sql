/*
  # Update warehouse policies and constraints
  
  1. Changes
    - Remove branch type from warehouses
    - Update existing data to match new constraints
    - Update policies for admin and operator access
    
  2. Security
    - Maintain proper access control
    - Only allow main and operator warehouse types
*/

-- First, update any existing data to match new constraints
UPDATE inventory_warehouses
SET operator_id = NULL, branch_id = NULL
WHERE type = 'main';

UPDATE inventory_warehouses
SET branch_id = NULL
WHERE type = 'operator';

-- Delete any branch type warehouses since they shouldn't exist
DELETE FROM inventory_warehouses WHERE type = 'branch';

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
  -- Allow access to main warehouse for all authenticated users
  type = 'main' OR
  -- Allow access to operator's own warehouse
  (type = 'operator' AND operator_id IN (
    SELECT id FROM operators WHERE auth_id = auth.uid()
  ))
);

-- Update warehouse type check constraint
ALTER TABLE inventory_warehouses
DROP CONSTRAINT IF EXISTS warehouse_owner_check;

ALTER TABLE inventory_warehouses
ADD CONSTRAINT warehouse_owner_check CHECK (
  (type = 'main' AND branch_id IS NULL AND operator_id IS NULL) OR
  (type = 'operator' AND branch_id IS NULL AND operator_id IS NOT NULL)
);