/*
  # Fix document RLS policies for new entity types

  1. Changes
    - Drop old document access policy
    - Create new policies for 'internal' and 'public' entity types

  2. Security
    - 'public' documents: accessible by everyone (including local auth users)
    - 'internal' documents: accessible only by admin and operators (including local auth)
*/

-- Drop old policy
DROP POLICY IF EXISTS "Enable customer access to own documents" ON documents;

-- Allow everyone (including local auth) to see 'public' documents
CREATE POLICY "Enable access to public documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'public');

-- Allow admin and operators (including local auth) to see 'internal' documents
CREATE POLICY "Enable access to internal documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'internal');

-- Allow admin to insert documents
CREATE POLICY "Enable admin insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to update documents
CREATE POLICY "Enable admin update documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to delete documents
CREATE POLICY "Enable admin delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');
