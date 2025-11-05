/*
  # Add company settings table
  
  1. New Tables
    - `company_settings`: Store company information and settings
    
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create company settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text NOT NULL DEFAULT 'İlaçlamatik',
  tax_office text,
  tax_number text,
  phone text,
  email text,
  address text,
  website text,
  header_text text,
  footer_text text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_settings_record CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable admin full access"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com')
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Insert default settings if not exists
INSERT INTO company_settings (
  company_name,
  tax_office,
  tax_number,
  phone,
  email,
  address,
  website,
  header_text,
  footer_text
) VALUES (
  'İlaçlamatik',
  'Konak',
  '1234567890',
  '0232 123 45 67',
  'info@ilaclamatik.com',
  'Alsancak Mah. 1234 Sok. No:1 Konak/İzmir',
  'www.ilaclamatik.com',
  'Haşere Kontrol Yazılımı',
  '© 2025 İlaçlamatik. Tüm hakları saklıdır.'
)
ON CONFLICT (id) DO NOTHING;