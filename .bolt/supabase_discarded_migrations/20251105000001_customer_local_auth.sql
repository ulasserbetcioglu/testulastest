/*
  # Add local authentication for customers and branches

  1. Changes
    - Add email and password_hash columns to customers table
    - Add email and password_hash columns to branches table
    - Remove dependency on auth.users for customer authentication
    - Add indexes for faster email lookups
    - Update RLS policies to allow public access for authentication

  2. Security
    - Email fields are unique to prevent duplicates
    - Passwords will be hashed using bcrypt in application layer
    - RLS policies updated to allow authentication checks
    - Session management will be handled in application layer
*/

-- Add email and password_hash to customers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE customers ADD COLUMN password_hash text;
  END IF;
END $$;

-- Make email unique in customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customers_email_key' AND table_name = 'customers'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);
  END IF;
END $$;

-- Add email and password_hash to branches if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE branches ADD COLUMN password_hash text;
  END IF;
END $$;

-- Make email unique in branches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'branches_email_key' AND table_name = 'branches'
  ) THEN
    ALTER TABLE branches ADD CONSTRAINT branches_email_key UNIQUE (email);
  END IF;
END $$;

-- Create indexes for faster email lookups
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS branches_email_idx ON branches(email);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;

-- Create new policies that allow authentication checks
CREATE POLICY "Allow public read for authentication" ON customers
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert customers" ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

-- Update branches policies to allow public read for authentication
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON branches;

CREATE POLICY "Allow public read for authentication" ON branches
  FOR SELECT
  USING (true);
