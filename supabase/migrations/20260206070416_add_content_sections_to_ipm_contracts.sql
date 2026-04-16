/*
  # Add editable content sections to IPM contracts

  1. Modified Tables
    - `ipm_contracts`
      - Added `content_sections` (jsonb) - Stores editable text content for each section of the IPM document

  2. Notes
    - When content_sections is empty or a key is missing, the application uses default text
    - Template variables like {customer_name}, {customer_address} etc. are replaced at render time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ipm_contracts' AND column_name = 'content_sections'
  ) THEN
    ALTER TABLE ipm_contracts ADD COLUMN content_sections jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
