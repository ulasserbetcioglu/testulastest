/*
  # Add floor plan columns to customers and branches tables
  
  1. Changes
    - Add floor_plan column to customers table
    - Add floor_plan column to branches table
    - Add last_check column to branch_equipment table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add floor_plan column to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS floor_plan jsonb;

-- Add floor_plan column to branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS floor_plan jsonb;

-- Add last_check column to branch_equipment table
ALTER TABLE branch_equipment
  ADD COLUMN IF NOT EXISTS last_check jsonb;