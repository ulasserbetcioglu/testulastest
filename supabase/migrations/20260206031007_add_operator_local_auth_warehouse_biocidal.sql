/*
  # Add anon access for warehouses, warehouse items, transfers, and biocidal usage

  Operators using local auth need access to:
  1. warehouses - SELECT (view own warehouse), INSERT (create)
  2. warehouse_items - SELECT (view stock), INSERT (add items), UPDATE (adjust stock)
  3. warehouse_transfers - SELECT (view transfers), INSERT (create transfers)
  4. biocidal_products_usage - INSERT (log product usage during visits)

  These tables were previously restricted to authenticated users only.
*/

-- warehouses: anon SELECT, INSERT, UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read warehouses for local auth' AND polrelid = 'public.warehouses'::regclass
  ) THEN
    CREATE POLICY "Allow anon read warehouses for local auth"
      ON public.warehouses FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert warehouses for local auth' AND polrelid = 'public.warehouses'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert warehouses for local auth"
      ON public.warehouses FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update warehouses for local auth' AND polrelid = 'public.warehouses'::regclass
  ) THEN
    CREATE POLICY "Allow anon update warehouses for local auth"
      ON public.warehouses FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- warehouse_items: anon SELECT, INSERT, UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read warehouse_items for local auth' AND polrelid = 'public.warehouse_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon read warehouse_items for local auth"
      ON public.warehouse_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert warehouse_items for local auth' AND polrelid = 'public.warehouse_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert warehouse_items for local auth"
      ON public.warehouse_items FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update warehouse_items for local auth' AND polrelid = 'public.warehouse_items'::regclass
  ) THEN
    CREATE POLICY "Allow anon update warehouse_items for local auth"
      ON public.warehouse_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- warehouse_transfers: anon SELECT, INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read warehouse_transfers for local auth' AND polrelid = 'public.warehouse_transfers'::regclass
  ) THEN
    CREATE POLICY "Allow anon read warehouse_transfers for local auth"
      ON public.warehouse_transfers FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert warehouse_transfers for local auth' AND polrelid = 'public.warehouse_transfers'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert warehouse_transfers for local auth"
      ON public.warehouse_transfers FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- biocidal_products_usage: anon INSERT (operators log usage during visits)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert biocidal_usage for local auth' AND polrelid = 'public.biocidal_products_usage'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert biocidal_usage for local auth"
      ON public.biocidal_products_usage FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
