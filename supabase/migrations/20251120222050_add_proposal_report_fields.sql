/*
  # Add Proposal Report Module Fields

  1. Changes
    - Add customer_id and branch_id for linking to customers/branches
    - Add report_url to store generated report image
    - Add proposal_date for tracking when proposal was created
    - Add prepared_by for tracking who prepared the proposal
    - Add scope_items and product_items as JSONB for flexible storage
    - Add terms and conditions field

  2. Security
    - Maintain existing RLS policies
*/

-- Add missing columns to proposals table
ALTER TABLE proposals 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id),
  ADD COLUMN IF NOT EXISTS report_url TEXT,
  ADD COLUMN IF NOT EXISTS proposal_date DATE,
  ADD COLUMN IF NOT EXISTS prepared_by TEXT,
  ADD COLUMN IF NOT EXISTS scope_items JSONB,
  ADD COLUMN IF NOT EXISTS product_items JSONB,
  ADD COLUMN IF NOT EXISTS terms TEXT;