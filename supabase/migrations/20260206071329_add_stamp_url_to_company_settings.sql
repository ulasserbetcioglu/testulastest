/*
  # Add company stamp (kase) image URL to company settings

  1. Modified Tables
    - `company_settings`
      - Added `stamp_url` (text) - URL for the company stamp/seal image used on contracts and documents

  2. Notes
    - The stamp image is optional and appears at the bottom of contracts (IPM, service contracts, etc.)
    - Stored in the existing company-assets storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'stamp_url'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN stamp_url text DEFAULT '';
  END IF;
END $$;
