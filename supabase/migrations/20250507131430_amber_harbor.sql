/*
  # Fix RLS policies for visits table
  
  1. Changes
    - Simplify RLS policies
    - Ensure admin can see all visits
    - Keep operator access to their own visits
    
  2. Security
    - Maintain proper access control
    - Admin has full access
    - Operators can only see their own visits
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON visits;

-- Create new simplified policies
CREATE POLICY "Enable read access for authenticated users"
  ON visits FOR SELECT
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.id = visits.operator_id 
      AND operators.auth_id = auth.uid()
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
    EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.id = visits.operator_id 
      AND operators.auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable delete access for authenticated users"
  ON visits FOR DELETE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.id = visits.operator_id 
      AND operators.auth_id = auth.uid()
    )
  );