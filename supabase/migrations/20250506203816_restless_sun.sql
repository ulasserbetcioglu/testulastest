/*
  # Add application types table

  1. New Tables
    - `application_types`
      - `id` (uuid, primary key)
      - `name` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Only admin can modify data
    - All authenticated users can read data
*/

CREATE TABLE IF NOT EXISTS application_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE application_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON application_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON application_types
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON application_types
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON application_types
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Insert default application types
INSERT INTO application_types (name, is_active) VALUES
  ('İlk', true),
  ('Ücretli', true),
  ('Acil Çağrı', true),
  ('Teknik İnceleme', true),
  ('Periyodik', true),
  ('İşyeri', true),
  ('Gözlem', true),
  ('Son', true);