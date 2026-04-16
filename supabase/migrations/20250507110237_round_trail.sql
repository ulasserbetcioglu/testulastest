/*
  # Add branch equipment management

  1. New Tables
    - `branch_equipment`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, foreign key)
      - `equipment_id` (uuid, foreign key)
      - `equipment_code` (text)
      - `department` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS branch_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_code text NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branch_equipment ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON branch_equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON branch_equipment
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON branch_equipment
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON branch_equipment
  FOR DELETE TO authenticated USING (true);

-- Add indexes
CREATE INDEX branch_equipment_branch_id_idx ON branch_equipment(branch_id);
CREATE INDEX branch_equipment_equipment_id_idx ON branch_equipment(equipment_id);
CREATE INDEX branch_equipment_equipment_code_idx ON branch_equipment(equipment_code);