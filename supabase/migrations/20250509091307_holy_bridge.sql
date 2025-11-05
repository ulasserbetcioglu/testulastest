/*
  # Add branch_equipment table

  1. New Tables
    - `branch_equipment`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, references branches.id)
      - `equipment_id` (uuid, references equipment.id)
      - `equipment_code` (text)
      - `department` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `branch_equipment` table
    - Add policies for authenticated users to manage their branch equipment
*/

-- Create branch_equipment table
CREATE TABLE IF NOT EXISTS branch_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_code text NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS branch_equipment_branch_id_idx ON branch_equipment(branch_id);
CREATE INDEX IF NOT EXISTS branch_equipment_equipment_id_idx ON branch_equipment(equipment_id);

-- Enable RLS
ALTER TABLE branch_equipment ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users"
  ON branch_equipment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON branch_equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON branch_equipment
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
  ON branch_equipment
  FOR DELETE
  TO authenticated
  USING (true);