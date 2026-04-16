/*
  # Add offer items table
  
  1. New Tables
    - `offer_items`: Store individual items in each offer
    
  2. Security
    - Enable RLS
    - Add policies for admin and operators
*/

-- Create offer items table
CREATE TABLE IF NOT EXISTS offer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES offers(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 20,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE offer_items ENABLE ROW LEVEL SECURITY;

-- Create policies for offer_items
CREATE POLICY "Enable read access for authenticated users" ON offer_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON offer_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON offer_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON offer_items
  FOR DELETE TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS offer_items_offer_id_idx ON offer_items(offer_id);
CREATE INDEX IF NOT EXISTS offer_items_line_number_idx ON offer_items(line_number);