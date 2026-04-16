/*
  # Add UV Lamp Report Module Fields

  1. Changes
    - Add customer_id and branch_id for linking to customers/branches
    - Add report_url to store generated report image
    - Add prepared_by for tracking who prepared the report
    - Add additional metadata fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add missing columns to uv_lamp_reports table
ALTER TABLE uv_lamp_reports 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
  ADD COLUMN IF NOT EXISTS report_url TEXT,
  ADD COLUMN IF NOT EXISTS prepared_by TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';