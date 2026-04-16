-- Add policy for customers and branches to view their paid material sales
DROP POLICY IF EXISTS "Enable customer access to own paid material sales" ON paid_material_sales;
CREATE POLICY "Enable customer access to own paid material sales"
  ON paid_material_sales
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own paid material sales
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = paid_material_sales.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see paid material sales for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = paid_material_sales.branch_id
      AND branches.auth_id = auth.uid()
    )
  );

-- Add policy for customers and branches to view their paid material sale items
DROP POLICY IF EXISTS "Enable customer access to own paid material sale items" ON paid_material_sale_items;
CREATE POLICY "Enable customer access to own paid material sale items"
  ON paid_material_sale_items
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own paid material sale items
    EXISTS (
      SELECT 1 FROM paid_material_sales
      WHERE paid_material_sales.id = paid_material_sale_items.sale_id
      AND EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = paid_material_sales.customer_id
        AND customers.auth_id = auth.uid()
      )
    )
    -- Branch can see paid material sale items for their branch
    OR EXISTS (
      SELECT 1 FROM paid_material_sales
      WHERE paid_material_sales.id = paid_material_sale_items.sale_id
      AND EXISTS (
        SELECT 1 FROM branches
        WHERE branches.id = paid_material_sales.branch_id
        AND branches.auth_id = auth.uid()
      )
    )
  );