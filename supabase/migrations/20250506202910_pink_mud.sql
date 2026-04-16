/*
  # Add definition tables with improved fields

  1. New Tables
    - `equipment`
      - Equipment and tools used in pest control
    - `pests`
      - Pest types and categories
    - `biocidal_products`
      - Products and chemicals used in treatments

  2. Security
    - Enable RLS on all tables
    - Only admin can modify data
    - All authenticated users can read data
*/

-- Equipment table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Only enable RLS if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'equipment' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON equipment;
DROP POLICY IF EXISTS "Enable insert access for admin" ON equipment;
DROP POLICY IF EXISTS "Enable update access for admin" ON equipment;
DROP POLICY IF EXISTS "Enable delete access for admin" ON equipment;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON equipment
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON equipment
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON equipment
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Pests table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS pests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    scientific_name text,
    description text,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Only enable RLS if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'pests' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE pests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON pests;
DROP POLICY IF EXISTS "Enable insert access for admin" ON pests;
DROP POLICY IF EXISTS "Enable update access for admin" ON pests;
DROP POLICY IF EXISTS "Enable delete access for admin" ON pests;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON pests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON pests
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON pests
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON pests
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Biocidal products table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS biocidal_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    active_ingredient text,
    license_number text,
    manufacturer text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Only enable RLS if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'biocidal_products' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE biocidal_products ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON biocidal_products;
DROP POLICY IF EXISTS "Enable insert access for admin" ON biocidal_products;
DROP POLICY IF EXISTS "Enable update access for admin" ON biocidal_products;
DROP POLICY IF EXISTS "Enable delete access for admin" ON biocidal_products;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON biocidal_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON biocidal_products
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON biocidal_products
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON biocidal_products
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');