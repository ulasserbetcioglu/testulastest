/*
  # Add Risk Assessment Report Fields

  1. Changes
    - Add report_url column to store generated report image
    - Add assessment detail columns (assessor_company, client_company, property_type, etc.)
    - Keep existing customer_id and branch_id for linking
    - Add risk level columns for different categories

  2. Security
    - Maintain existing RLS policies
*/

-- Add missing columns to risk_assessments table
ALTER TABLE risk_assessments 
  ADD COLUMN IF NOT EXISTS report_url TEXT,
  ADD COLUMN IF NOT EXISTS assessor_company TEXT,
  ADD COLUMN IF NOT EXISTS assessor_name TEXT,
  ADD COLUMN IF NOT EXISTS client_company TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS rodent_risk TEXT,
  ADD COLUMN IF NOT EXISTS insect_risk TEXT,
  ADD COLUMN IF NOT EXISTS bird_risk TEXT,
  ADD COLUMN IF NOT EXISTS other_risk TEXT,
  ADD COLUMN IF NOT EXISTS storage_pest_risk TEXT,
  ADD COLUMN IF NOT EXISTS flying_pest_risk TEXT,
  ADD COLUMN IF NOT EXISTS equipment_risk TEXT;