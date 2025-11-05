DO $$ 
DECLARE
  _table record;
  _function record;
  _trigger record;
BEGIN
  -- Drop tables if they exist
  FOR _table IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('inventory_transactions', 'inventory_items', 'inventory_warehouses')
  ) 
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', _table.table_name);
  END LOOP;

  -- Drop functions if they exist
  FOR _function IN (
    SELECT proname 
    FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace 
    AND proname = 'handle_inventory_transfer'
  ) 
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', _function.proname);
  END LOOP;
END $$;