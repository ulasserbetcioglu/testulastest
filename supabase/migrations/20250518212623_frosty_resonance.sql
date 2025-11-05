/*
  # Add coordinates to customers table
  
  1. Changes
    - Add latitude and longitude columns to customers table
    - Add indexes for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add latitude and longitude columns to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS customers_latitude_idx ON customers(latitude);
CREATE INDEX IF NOT EXISTS customers_longitude_idx ON customers(longitude);