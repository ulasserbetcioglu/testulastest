/*
  # Update warehouse_items policies for operator access
  
  1. Changes
    - Add policy to allow operators to update their own warehouse items
    - Ensure operators can only update items in warehouses they own
    
  2. Security
    - Maintain existing RLS policies
    - Only allow operators to update their own warehouse items
*/

-- Create policy to allow operators to update their own warehouse items
CREATE POLICY "Enable update access for operators" ON warehouse_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM warehouses w
    JOIN operators o ON w.operator_id = o.id
    WHERE w.id = warehouse_items.warehouse_id
    AND o.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM warehouses w
    JOIN operators o ON w.operator_id = o.id
    WHERE w.id = warehouse_items.warehouse_id
    AND o.auth_id = auth.uid()
  )
);