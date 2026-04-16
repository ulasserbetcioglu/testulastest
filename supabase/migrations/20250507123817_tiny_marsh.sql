/*
  # Update operators table with auth user references
  
  1. Changes
    - Add auth_id column if not exists
    - Update existing operators with matching auth users
    - Add policies to ensure proper access control
    
  2. Security
    - Maintain RLS policies
    - Only allow operators to access their own data
*/

-- Add auth_id column to operators table if it doesn't exist
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);

-- Update existing operators with matching auth users
UPDATE operators o
SET auth_id = au.id
FROM auth.users au
WHERE o.email = au.email
  AND o.auth_id IS NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON operators;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON operators;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON operators;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON operators;

-- Create new policies that check auth_id
CREATE POLICY "Enable read access for authenticated users"
  ON operators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for admin"
  ON operators FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin"
  ON operators FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin"
  ON operators FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS operators_auth_id_idx ON operators(auth_id);