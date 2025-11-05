/*
  # Simplify pests table structure

  1. Changes
    - Remove unnecessary columns from pests table
    - Keep only essential fields: name, order_no, is_active
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop unnecessary columns from pests table
ALTER TABLE pests
  DROP COLUMN IF EXISTS scientific_name,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category;