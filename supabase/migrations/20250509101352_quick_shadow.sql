-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for admin" ON operators;
DROP POLICY IF EXISTS "Enable delete access for admin" ON operators;

-- Create new policies with proper admin check
CREATE POLICY "Enable insert access for admin"
  ON operators
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin"
  ON operators
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');