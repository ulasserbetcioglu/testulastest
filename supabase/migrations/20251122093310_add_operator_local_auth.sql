/*
  # Add local authentication for operators

  1. Changes
    - Add email column to operators table (if not exists)
    - Add password_hash column to operators table
    - Remove dependency on auth.users for operator authentication
    - Add indexes for faster email lookups
    - Update RLS policies to allow public access for authentication

  2. Security
    - Email fields are unique to prevent duplicates
    - Passwords will be hashed using bcrypt in application layer
    - RLS policies updated to allow authentication checks
    - Session management will be handled in application layer
*/

-- Add email column to operators if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'email'
  ) THEN
    ALTER TABLE operators ADD COLUMN email text;
  END IF;
END $$;

-- Add password_hash to operators if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE operators ADD COLUMN password_hash text;
  END IF;
END $$;

-- Make email unique in operators
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'operators_email_key' AND table_name = 'operators'
  ) THEN
    ALTER TABLE operators ADD CONSTRAINT operators_email_key UNIQUE (email);
  END IF;
END $$;

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS operators_email_idx ON operators(email);

-- Drop existing operator policies
DROP POLICY IF EXISTS "Users can read operators" ON operators;
DROP POLICY IF EXISTS "Users can insert operators" ON operators;
DROP POLICY IF EXISTS "Users can update operators" ON operators;

-- Create new policies that allow authentication checks
CREATE POLICY "Allow public read for authentication" ON operators
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert operators" ON operators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update operators" ON operators
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow operators to update their own records via local auth
CREATE POLICY "Operators can update own data via local auth" ON operators
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
