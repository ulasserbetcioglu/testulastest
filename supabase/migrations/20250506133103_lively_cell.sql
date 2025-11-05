/*
  # Fix RLS policies for customers table

  1. Changes
    - Drop existing policies
    - Create new policies that properly check authentication state
    - Ensure authenticated users can perform CRUD operations
    
  2. Security
    - Maintain RLS protection
    - Only allow authenticated users to access data
    - Prevent unauthorized access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;

-- Create new policies with proper authentication checks
CREATE POLICY "Enable read access for authenticated users" ON customers
  FOR SELECT 
  TO authenticated 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON customers
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON customers
  FOR UPDATE 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON customers
  FOR DELETE 
  TO authenticated 
  USING (auth.role() = 'authenticated');