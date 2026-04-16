/*
  # Add missing operator and fix permissions
  
  1. Changes
    - Insert missing operator if not exists
    - Update RLS policies to ensure proper access
    
  2. Security
    - Maintain existing security model
    - Ensure proper operator access
*/

-- First check if operator exists and insert if not
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'samet.sen2@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (
      name,
      email,
      status,
      phone
    ) VALUES (
      'Samet Şen',
      'samet.sen2@pestmentor.com.tr',
      'Açık',
      NULL
    );
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON operators;
DROP POLICY IF EXISTS "Enable insert access for admin" ON operators;
DROP POLICY IF EXISTS "Enable update access for admin" ON operators;
DROP POLICY IF EXISTS "Enable delete access for admin" ON operators;

-- Create new policies
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