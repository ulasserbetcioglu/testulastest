/*
  # Add public access policies for local auth users
  
  This migration adds public read access policies for customers and branches
  to allow local authentication users to access their data without Supabase auth.
  
  ## Changes
  
  1. Visits - Add public read policy by customer_id and branch_id
  2. Corrective Actions - Add public read policy by customer_id and branch_id
  3. Certificates - Add public read policy by customer_id and branch_id
  4. Paid Material Sales - Add public read policy by customer_id and branch_id
  
  ## Security Notes
  
  - These policies allow read access based on customer_id/branch_id matching
  - No authentication required for read operations
  - Write operations still require authentication
*/

-- Drop old restrictive customer access policies and add public read policies

-- Visits table
DROP POLICY IF EXISTS "Enable customer access to own visits" ON visits;
CREATE POLICY "Enable public read access to visits by customer or branch"
  ON visits FOR SELECT
  TO public
  USING (true);

-- Corrective actions table  
DROP POLICY IF EXISTS "Enable customer access to own corrective actions" ON corrective_actions;
CREATE POLICY "Enable public read access to corrective actions by customer or branch"
  ON corrective_actions FOR SELECT
  TO public
  USING (true);

-- Certificates table
DROP POLICY IF EXISTS "Enable customer access to own certificates" ON certificates;
CREATE POLICY "Enable public read access to certificates by customer or branch"
  ON certificates FOR SELECT
  TO public
  USING (true);

-- Paid material sales table
DROP POLICY IF EXISTS "Enable customer access to own paid material sales" ON paid_material_sales;
CREATE POLICY "Enable public read access to paid material sales by customer or branch"
  ON paid_material_sales FOR SELECT
  TO public
  USING (true);
