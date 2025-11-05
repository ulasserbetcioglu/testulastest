/*
  # Update visits table with new fields
  
  1. Changes
    - Add visit_type field
    - Add pest_types array field
    - Add equipment_checks JSONB field
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to visits table
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS pest_types text[],
  ADD COLUMN IF NOT EXISTS equipment_checks jsonb;

-- Add constraint for visit_type
ALTER TABLE visits
  ADD CONSTRAINT visits_visit_type_check 
  CHECK (visit_type IN (
    'ilk', 'ucretli', 'acil', 'teknik', 'periyodik', 
    'isyeri', 'gozlem', 'son'
  ));