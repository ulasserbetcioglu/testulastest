/*
  # Update biocidal products table with new fields

  1. Changes
    - Add unit_type for packaging type (gram, ml, etc)
    - Add quantity for amount per unit
    - Add package_type for container type (box, bottle, etc)
    - Add license_date for product registration
    - Maintain existing fields and constraints

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE biocidal_products
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS license_date date;