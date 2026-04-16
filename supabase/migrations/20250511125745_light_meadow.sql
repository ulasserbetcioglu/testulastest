/*
  # Add offer templates functionality
  
  1. New Tables
    - `offer_templates`: Store offer template information
    - `offer_template_sections`: Store sections for each template
    
  2. Security
    - Enable RLS
    - Add policies for admin and operators
*/

-- Create offer templates table
CREATE TABLE IF NOT EXISTS offer_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create offer template sections table
CREATE TABLE IF NOT EXISTS offer_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES offer_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'list', 'table')),
  content text NOT NULL,
  order_no integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_template_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for offer_templates
CREATE POLICY "Enable read access for authenticated users" ON offer_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON offer_templates
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON offer_templates
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON offer_templates
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for offer_template_sections
CREATE POLICY "Enable read access for authenticated users" ON offer_template_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for admin" ON offer_template_sections
  FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable update access for admin" ON offer_template_sections
  FOR UPDATE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin" ON offer_template_sections
  FOR DELETE TO authenticated USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS offer_template_sections_template_id_idx ON offer_template_sections(template_id);
CREATE INDEX IF NOT EXISTS offer_template_sections_order_no_idx ON offer_template_sections(order_no);