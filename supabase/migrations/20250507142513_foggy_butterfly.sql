/*
  # Add inventory transfer functionality
  
  1. Changes
    - Add trigger to update stock levels on transfer
    - Add function to handle transfers safely
    - Add constraints to prevent negative stock
    
  2. Security
    - Ensure atomic updates
    - Prevent invalid transfers
*/

-- Function to handle inventory transfers
CREATE OR REPLACE FUNCTION handle_inventory_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- For transfers between warehouses
  IF NEW.type = 'transfer' THEN
    -- Check if source has enough stock
    IF NOT EXISTS (
      SELECT 1 FROM inventory_items 
      WHERE id = NEW.item_id 
      AND warehouse_id = NEW.source_warehouse_id
      AND current_stock >= NEW.quantity
    ) THEN
      RAISE EXCEPTION 'Yetersiz stok';
    END IF;

    -- Decrease stock in source warehouse
    UPDATE inventory_items
    SET 
      current_stock = current_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id 
    AND warehouse_id = NEW.source_warehouse_id;

    -- Increase stock in target warehouse
    INSERT INTO inventory_items (
      warehouse_id,
      code,
      name,
      category,
      unit,
      current_stock,
      min_stock,
      max_stock
    )
    SELECT 
      NEW.target_warehouse_id,
      source.code,
      source.name,
      source.category,
      source.unit,
      NEW.quantity,
      source.min_stock,
      source.max_stock
    FROM inventory_items source
    WHERE source.id = NEW.item_id
    ON CONFLICT (warehouse_id, code) DO UPDATE
    SET 
      current_stock = inventory_items.current_stock + NEW.quantity,
      updated_at = now();
  END IF;

  -- For consumption
  IF NEW.type = 'consumption' THEN
    -- Check if source has enough stock
    IF NOT EXISTS (
      SELECT 1 FROM inventory_items 
      WHERE id = NEW.item_id 
      AND warehouse_id = NEW.source_warehouse_id
      AND current_stock >= NEW.quantity
    ) THEN
      RAISE EXCEPTION 'Yetersiz stok';
    END IF;

    -- Decrease stock
    UPDATE inventory_items
    SET 
      current_stock = current_stock - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id 
    AND warehouse_id = NEW.source_warehouse_id;
  END IF;

  -- For adjustments
  IF NEW.type = 'adjustment' THEN
    UPDATE inventory_items
    SET 
      current_stock = NEW.quantity,
      updated_at = now()
    WHERE id = NEW.item_id 
    AND warehouse_id = NEW.source_warehouse_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory transactions
DROP TRIGGER IF EXISTS inventory_transfer_trigger ON inventory_transactions;
CREATE TRIGGER inventory_transfer_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_inventory_transfer();

-- Add constraint to prevent negative stock
ALTER TABLE inventory_items
  ADD CONSTRAINT prevent_negative_stock
  CHECK (current_stock >= 0);