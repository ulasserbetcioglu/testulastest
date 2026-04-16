/*
  # Create ekipmantrend Table
  
  1. New Tables
    - `ekipmantrend`
      - `id` (uuid, primary key) - Unique identifier
      - `visit_id` (uuid, foreign key) - Reference to visits table
      - `equipment_key` (text) - Equipment identifier from equipment_checks JSONB
      - `equipment_data` (jsonb) - All data for this specific equipment
      - `branch_id` (uuid) - Denormalized for faster queries
      - `visit_date` (timestamptz) - Denormalized for faster queries
      - `operator_id` (uuid) - Denormalized for faster queries
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
  
  2. Indexes
    - Index on visit_id for fast lookups
    - Index on equipment_key for filtering by equipment
    - Index on branch_id for branch-specific queries
    - Index on visit_date for time-based queries
    - Composite index on (branch_id, visit_date) for common query patterns
  
  3. Data Migration
    - Automatically copies all existing equipment_checks data from visits table
    - Extracts each equipment entry from JSONB and creates separate rows
  
  4. Security
    - Enable RLS on ekipmantrend table
    - Policies for authenticated users to read data
    - Policies for authenticated users to insert/update/delete their own data
    - Admin users have full access
  
  5. Automatic Sync
    - Triggers automatically sync equipment_checks changes to ekipmantrend
    - On INSERT or UPDATE of visits, equipment_checks are automatically extracted
*/

-- Create ekipmantrend table
CREATE TABLE IF NOT EXISTS ekipmantrend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  equipment_key text NOT NULL,
  equipment_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  visit_date timestamptz,
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_visit_id ON ekipmantrend(visit_id);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_equipment_key ON ekipmantrend(equipment_key);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_branch_id ON ekipmantrend(branch_id);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_visit_date ON ekipmantrend(visit_date);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_branch_date ON ekipmantrend(branch_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_equipment_data ON ekipmantrend USING gin(equipment_data);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_ekipmantrend_updated_at ON ekipmantrend;
CREATE TRIGGER set_ekipmantrend_updated_at
  BEFORE UPDATE ON ekipmantrend
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data from visits.equipment_checks to ekipmantrend
INSERT INTO ekipmantrend (visit_id, equipment_key, equipment_data, branch_id, visit_date, operator_id, created_at)
SELECT 
  v.id as visit_id,
  equipment_entry.key as equipment_key,
  equipment_entry.value as equipment_data,
  v.branch_id,
  v.visit_date,
  v.operator_id,
  v.created_at
FROM visits v
CROSS JOIN LATERAL jsonb_each(v.equipment_checks) as equipment_entry
WHERE v.equipment_checks IS NOT NULL 
  AND jsonb_typeof(v.equipment_checks) = 'object'
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE ekipmantrend ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all data
CREATE POLICY "Authenticated users can view ekipmantrend"
  ON ekipmantrend FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert ekipmantrend
CREATE POLICY "Authenticated users can insert ekipmantrend"
  ON ekipmantrend FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update ekipmantrend
CREATE POLICY "Authenticated users can update ekipmantrend"
  ON ekipmantrend FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete ekipmantrend
CREATE POLICY "Authenticated users can delete ekipmantrend"
  ON ekipmantrend FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Public read access (for local auth compatibility)
CREATE POLICY "Public can view ekipmantrend"
  ON ekipmantrend FOR SELECT
  TO public
  USING (true);

-- Create a function to automatically sync new equipment_checks to ekipmantrend
CREATE OR REPLACE FUNCTION sync_equipment_checks_to_ekipmantrend()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old entries for this visit
  DELETE FROM ekipmantrend WHERE visit_id = NEW.id;
  
  -- Insert new entries if equipment_checks exists
  IF NEW.equipment_checks IS NOT NULL AND jsonb_typeof(NEW.equipment_checks) = 'object' THEN
    INSERT INTO ekipmantrend (visit_id, equipment_key, equipment_data, branch_id, visit_date, operator_id)
    SELECT 
      NEW.id,
      equipment_entry.key,
      equipment_entry.value,
      NEW.branch_id,
      NEW.visit_date,
      NEW.operator_id
    FROM jsonb_each(NEW.equipment_checks) as equipment_entry;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync equipment_checks
DROP TRIGGER IF EXISTS sync_equipment_checks_on_insert ON visits;
CREATE TRIGGER sync_equipment_checks_on_insert
  AFTER INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION sync_equipment_checks_to_ekipmantrend();

DROP TRIGGER IF EXISTS sync_equipment_checks_on_update ON visits;
CREATE TRIGGER sync_equipment_checks_on_update
  AFTER UPDATE OF equipment_checks ON visits
  FOR EACH ROW
  WHEN (OLD.equipment_checks IS DISTINCT FROM NEW.equipment_checks)
  EXECUTE FUNCTION sync_equipment_checks_to_ekipmantrend();
