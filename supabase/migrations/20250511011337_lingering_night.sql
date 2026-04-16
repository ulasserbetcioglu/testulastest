/*
  # Add sub-operator functionality
  
  1. Changes
    - Add assigned_customers and assigned_branches columns to operators table
    - Update RLS policies to enforce restrictions
    
  2. Security
    - Admin has full access
    - Sub-operators can only access their assigned customers and branches
*/

-- Add assigned_customers and assigned_branches columns to operators table
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS assigned_customers uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_branches uuid[] DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS operators_assigned_customers_idx ON operators USING GIN (assigned_customers);
CREATE INDEX IF NOT EXISTS operators_assigned_branches_idx ON operators USING GIN (assigned_branches);

-- Update RLS policies for visits table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON visits;
CREATE POLICY "Enable read access for authenticated users"
  ON visits
  FOR SELECT
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid() 
      AND o.id = visits.operator_id
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        visits.customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR visits.branch_id IS NULL) OR
        -- Or branch is in assigned branches
        visits.branch_id = ANY(o.assigned_branches)
      )
    )
  );

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;
CREATE POLICY "Enable insert access for authenticated users"
  ON visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid() 
      AND o.id = operator_id
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR branch_id IS NULL) OR
        -- Or branch is in assigned branches
        branch_id = ANY(o.assigned_branches)
      )
    )
  );

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON visits;
CREATE POLICY "Enable update access for authenticated users"
  ON visits
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid() 
      AND o.id = visits.operator_id
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        visits.customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR visits.branch_id IS NULL) OR
        -- Or branch is in assigned branches
        visits.branch_id = ANY(o.assigned_branches)
      )
    )
  );

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON visits;
CREATE POLICY "Enable delete access for authenticated users"
  ON visits
  FOR DELETE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid() 
      AND o.id = visits.operator_id
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        visits.customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR visits.branch_id IS NULL) OR
        -- Or branch is in assigned branches
        visits.branch_id = ANY(o.assigned_branches)
      )
    )
  );

-- Update RLS policies for corrective_actions table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON corrective_actions;
CREATE POLICY "Enable read access for authenticated users"
  ON corrective_actions
  FOR SELECT
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid()
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR branch_id IS NULL) OR
        -- Or branch is in assigned branches
        branch_id = ANY(o.assigned_branches)
      )
    )
  );

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON corrective_actions;
CREATE POLICY "Enable insert access for authenticated users"
  ON corrective_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.auth_id = auth.uid()
      AND (
        -- Either no restrictions (empty arrays)
        (o.assigned_customers IS NULL OR o.assigned_customers = '{}') OR
        -- Or customer is in assigned customers
        customer_id = ANY(o.assigned_customers)
      )
      AND (
        -- Either no branch restrictions or no branch specified
        (o.assigned_branches IS NULL OR o.assigned_branches = '{}' OR branch_id IS NULL) OR
        -- Or branch is in assigned branches
        branch_id = ANY(o.assigned_branches)
      )
    )
  );

-- Add function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT email() = 'admin@ilaclamatik.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check if operator has access to customer
CREATE OR REPLACE FUNCTION operator_has_customer_access(customer_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM operators o
    WHERE o.auth_id = auth.uid()
    AND (
      o.assigned_customers IS NULL OR 
      o.assigned_customers = '{}' OR
      customer_id = ANY(o.assigned_customers)
    )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check if operator has access to branch
CREATE OR REPLACE FUNCTION operator_has_branch_access(branch_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM operators o
    WHERE o.auth_id = auth.uid()
    AND (
      o.assigned_branches IS NULL OR 
      o.assigned_branches = '{}' OR
      branch_id IS NULL OR
      branch_id = ANY(o.assigned_branches)
    )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;