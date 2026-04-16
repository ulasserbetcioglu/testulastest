-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON visits;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON visits;

-- Create new simplified policies
CREATE POLICY "Enable read access for authenticated users"
  ON visits FOR SELECT
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com' OR EXISTS (
    SELECT 1 FROM operators 
    WHERE operators.auth_id = auth.uid() 
    AND operators.id = visits.operator_id
  ));

CREATE POLICY "Enable insert access for authenticated users"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com' OR EXISTS (
    SELECT 1 FROM operators 
    WHERE operators.auth_id = auth.uid() 
    AND operators.id = operator_id
  ));

CREATE POLICY "Enable update access for authenticated users"
  ON visits FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com' OR EXISTS (
    SELECT 1 FROM operators 
    WHERE operators.auth_id = auth.uid() 
    AND operators.id = visits.operator_id
  ));

CREATE POLICY "Enable delete access for authenticated users"
  ON visits FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com' OR EXISTS (
    SELECT 1 FROM operators 
    WHERE operators.auth_id = auth.uid() 
    AND operators.id = visits.operator_id
  ));