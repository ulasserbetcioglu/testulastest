/*
  # Update definition tables schema
  
  1. Changes
    - Add common fields to all definition tables
    - Add unique constraints for codes
    - Add indexes for better performance
    - Create paid products table
    - Set up RLS policies
    
  2. Security
    - Enable RLS on paid_products table
    - Add admin-only modification policies
*/

-- Add common fields to all definition tables
ALTER TABLE pests
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS properties jsonb;

ALTER TABLE biocidal_products
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_ingredient text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS license_date date;

ALTER TABLE application_types
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS order_no integer DEFAULT 0;

-- Add unique constraints for codes using DO block to check existence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pests_code_key'
  ) THEN
    ALTER TABLE pests ADD CONSTRAINT pests_code_key UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'equipment_code_key'
  ) THEN
    ALTER TABLE equipment ADD CONSTRAINT equipment_code_key UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'biocidal_products_code_key'
  ) THEN
    ALTER TABLE biocidal_products ADD CONSTRAINT biocidal_products_code_key UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_types_code_key'
  ) THEN
    ALTER TABLE application_types ADD CONSTRAINT application_types_code_key UNIQUE (code);
  END IF;
END $$;

-- Add indexes for better performance with column existence check
DO $$
BEGIN
  -- Check and create indexes for pests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pests' AND column_name = 'type'
  ) THEN
    DROP INDEX IF EXISTS pests_type_idx;
    CREATE INDEX pests_type_idx ON pests (type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pests' AND column_name = 'order_no'
  ) THEN
    DROP INDEX IF EXISTS pests_order_no_idx;
    CREATE INDEX pests_order_no_idx ON pests (order_no);
  END IF;

  -- Check and create indexes for equipment
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equipment' AND column_name = 'type'
  ) THEN
    DROP INDEX IF EXISTS equipment_type_idx;
    CREATE INDEX equipment_type_idx ON equipment (type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equipment' AND column_name = 'order_no'
  ) THEN
    DROP INDEX IF EXISTS equipment_order_no_idx;
    CREATE INDEX equipment_order_no_idx ON equipment (order_no);
  END IF;

  -- Check and create indexes for biocidal_products
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'biocidal_products' AND column_name = 'type'
  ) THEN
    DROP INDEX IF EXISTS biocidal_products_type_idx;
    CREATE INDEX biocidal_products_type_idx ON biocidal_products (type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'biocidal_products' AND column_name = 'order_no'
  ) THEN
    DROP INDEX IF EXISTS biocidal_products_order_no_idx;
    CREATE INDEX biocidal_products_order_no_idx ON biocidal_products (order_no);
  END IF;

  -- Check and create indexes for application_types
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'application_types' AND column_name = 'type'
  ) THEN
    DROP INDEX IF EXISTS application_types_type_idx;
    CREATE INDEX application_types_type_idx ON application_types (type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'application_types' AND column_name = 'order_no'
  ) THEN
    DROP INDEX IF EXISTS application_types_order_no_idx;
    CREATE INDEX application_types_order_no_idx ON application_types (order_no);
  END IF;
END $$;

-- Create paid products table if it doesn't exist
CREATE TABLE IF NOT EXISTS paid_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  type text,
  price numeric NOT NULL DEFAULT 0,
  unit_type text,
  is_active boolean DEFAULT true,
  order_no integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on paid_products
ALTER TABLE paid_products ENABLE ROW LEVEL SECURITY;

-- Create policies for paid_products
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for authenticated users" ON paid_products;
  DROP POLICY IF EXISTS "Enable insert access for admin" ON paid_products;
  DROP POLICY IF EXISTS "Enable update access for admin" ON paid_products;
  DROP POLICY IF EXISTS "Enable delete access for admin" ON paid_products;
END $$;

CREATE POLICY "Enable read access for authenticated users" ON paid_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON paid_products
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON paid_products
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON paid_products
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Add index for paid_products
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paid_products' AND column_name = 'type'
  ) THEN
    DROP INDEX IF EXISTS paid_products_type_idx;
    CREATE INDEX paid_products_type_idx ON paid_products (type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paid_products' AND column_name = 'order_no'
  ) THEN
    DROP INDEX IF EXISTS paid_products_order_no_idx;
    CREATE INDEX paid_products_order_no_idx ON paid_products (order_no);
  END IF;
END $$;