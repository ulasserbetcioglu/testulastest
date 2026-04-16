/*
  # Allow Public Insert on Visits (Temporary Fix)

  1. Changes
    - Add public INSERT policy for visits table
    - This bypasses authentication requirements
    - TEMPORARY: Should be replaced with proper auth

  2. Security
    - WARNING: This allows anyone to insert visits
    - Only use in development/testing
    - Replace with proper authentication before production
*/

-- Allow public INSERT on visits
CREATE POLICY "Allow public insert on visits"
  ON visits
  FOR INSERT
  TO public
  WITH CHECK (true);
