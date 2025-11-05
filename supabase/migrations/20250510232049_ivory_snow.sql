/*
  # Add coordinates to branches table
  
  1. Changes
    - Add latitude and longitude columns to branches table
    - Add indexes for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add latitude and longitude columns to branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS branches_latitude_idx ON branches(latitude);
CREATE INDEX IF NOT EXISTS branches_longitude_idx ON branches(longitude);