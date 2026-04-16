/*
  # Update certificates table policies
  
  1. Changes
    - Restrict certificate creation to admin only
    - Allow customers and branches to view their own certificates
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for admin and operators" ON certificates;

-- Create new policies
CREATE POLICY "Enable insert access for admin"
  ON certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Ensure customer access policy exists
DROP POLICY IF EXISTS "Enable customer access to own certificates" ON certificates;
CREATE POLICY "Enable customer access to own certificates"
  ON certificates
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own certificates
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = certificates.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see certificates for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = certificates.branch_id
      AND branches.auth_id = auth.uid()
    )
  );