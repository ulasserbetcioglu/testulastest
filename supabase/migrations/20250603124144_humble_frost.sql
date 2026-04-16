/*
  # Add report number to visits table
  
  1. Changes
    - Add report_number column to visits table
    - Make it nullable since existing records won't have a value
    - Add index for faster lookups
*/

-- Add report_number column
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS report_number text;

-- Add index for report_number
CREATE INDEX IF NOT EXISTS visits_report_number_idx 
ON visits (report_number);