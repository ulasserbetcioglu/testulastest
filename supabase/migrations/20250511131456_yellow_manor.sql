/*
  # Add documents table for document management
  
  1. New Tables
    - `documents`: Store document metadata
    
  2. Security
    - Enable RLS
    - Add policies for admin and users
*/

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for admin"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS documents_entity_type_idx ON documents(entity_type);
CREATE INDEX IF NOT EXISTS documents_entity_id_idx ON documents(entity_id);
CREATE INDEX IF NOT EXISTS documents_document_type_idx ON documents(document_type);
CREATE INDEX IF NOT EXISTS documents_created_by_idx ON documents(created_by);