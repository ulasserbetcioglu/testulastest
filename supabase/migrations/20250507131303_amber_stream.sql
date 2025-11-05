/*
  # Fix visits table RLS policies for admin access
  
  1. Changes
    - Update RLS policies to allow admin to see all visits
    - Maintain operator access to their own visits
    
  2. Security
    - Keep RLS enabled
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON visits;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON visits FOR SELECT
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    auth.uid() IN (
      SELECT auth_id FROM operators WHERE id = visits.operator_id
    )
  );

CREATE POLICY "Enable insert access for authenticated users"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON visits FOR UPDATE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    auth.uid() IN (
      SELECT auth_id FROM operators WHERE id = visits.operator_id
    )
  );

CREATE POLICY "Enable delete access for authenticated users"
  ON visits FOR DELETE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    auth.uid() IN (
      SELECT auth_id FROM operators WHERE id = visits.operator_id
    )
  );