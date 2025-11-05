/*
  # Add report_number column to visits table
  
  1. Changes
    - Add report_number column to visits table
    - Add index for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add report_number column
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS report_number text;

-- Add index for report_number
CREATE INDEX IF NOT EXISTS visits_report_number_idx 
ON visits (report_number);