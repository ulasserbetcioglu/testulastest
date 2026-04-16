-- First, ensure RLS is enabled
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON inventory_items;
DROP POLICY IF EXISTS "Enable update access for admin" ON inventory_items;

-- Create new policies for inventory_transactions
CREATE POLICY "Enable operator transaction creation"
ON inventory_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    INNER JOIN inventory_warehouses w ON w.operator_id = o.id
    WHERE o.auth_id = auth.uid()
    AND (
      -- Allow transfers from main warehouse to operator's warehouse
      (
        type = 'transfer' 
        AND EXISTS (
          SELECT 1 FROM inventory_warehouses sw 
          WHERE sw.id = source_warehouse_id 
          AND sw.type = 'main'
        )
        AND EXISTS (
          SELECT 1 FROM inventory_warehouses tw 
          WHERE tw.id = target_warehouse_id 
          AND tw.operator_id = o.id
        )
      )
      -- Allow consumption from operator's warehouse
      OR (
        type = 'consumption'
        AND EXISTS (
          SELECT 1 FROM inventory_warehouses sw
          WHERE sw.id = source_warehouse_id
          AND sw.operator_id = o.id
        )
      )
    )
  )
);

CREATE POLICY "Enable operator transaction viewing"
ON inventory_transactions
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    INNER JOIN inventory_warehouses w ON w.operator_id = o.id
    WHERE o.auth_id = auth.uid()
    AND (source_warehouse_id = w.id OR target_warehouse_id = w.id)
  )
);

-- Create new policies for inventory_items
CREATE POLICY "Enable operator item viewing"
ON inventory_items
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin@ilaclamatik.com'
  OR EXISTS (
    SELECT 1 FROM operators o
    INNER JOIN inventory_warehouses w ON w.operator_id = o.id
    WHERE o.auth_id = auth.uid()
    AND (
      warehouse_id = w.id
      OR EXISTS (
        SELECT 1 FROM inventory_warehouses mw
        WHERE mw.id = warehouse_id
        AND mw.type = 'main'
      )
    )
  )
);

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