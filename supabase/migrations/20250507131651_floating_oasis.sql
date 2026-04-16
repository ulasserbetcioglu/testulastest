/*
  # Fix visits RLS policies
  
  1. Changes
    - Drop existing policies
    - Create new policies with proper operator auth check
    - Update operator auth_id mapping
    
  2. Security
    - Enable admin access to all visits
    - Enable operator access to own visits only
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON visits;

-- Create new policies with proper operator auth check
CREATE POLICY "Enable read access for authenticated users"
  ON visits FOR SELECT
  TO authenticated
  USING (
    (auth.email() = 'admin@ilaclamatik.com') OR
    (EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.auth_id = auth.uid() 
      AND operators.id = visits.operator_id
    ))
  );

CREATE POLICY "Enable insert access for authenticated users"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.email() = 'admin@ilaclamatik.com') OR
    (EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.auth_id = auth.uid() 
      AND operators.id = operator_id
    ))
  );

CREATE POLICY "Enable update access for authenticated users"
  ON visits FOR UPDATE
  TO authenticated
  USING (
    (auth.email() = 'admin@ilaclamatik.com') OR
    (EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.auth_id = auth.uid() 
      AND operators.id = visits.operator_id
    ))
  );

CREATE POLICY "Enable delete access for authenticated users"
  ON visits FOR DELETE
  TO authenticated
  USING (
    (auth.email() = 'admin@ilaclamatik.com') OR
    (EXISTS (
      SELECT 1 FROM operators 
      WHERE operators.auth_id = auth.uid() 
      AND operators.id = visits.operator_id
    ))
  );

-- Ensure operators have auth_id set
UPDATE operators o
SET auth_id = u.id
FROM auth.users u
WHERE o.email = u.email
  AND o.auth_id IS NULL;