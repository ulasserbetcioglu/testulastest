-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON operators;
DROP POLICY IF EXISTS "Enable insert access for admin" ON operators;
DROP POLICY IF EXISTS "Enable update access for admin" ON operators;
DROP POLICY IF EXISTS "Enable delete access for admin" ON operators;

-- Create new policies with proper admin check
CREATE POLICY "Enable read access for authenticated users"
  ON operators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for admin"
  ON operators
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin"
  ON operators
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin"
  ON operators
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');