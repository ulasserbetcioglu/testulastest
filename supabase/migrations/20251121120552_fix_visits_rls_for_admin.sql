/*
  # Fix Visits RLS Policies for Admin Access

  1. Changes
    - Drop old restrictive INSERT policy
    - Create new simple INSERT policy for authenticated users
    - Admin can insert any visit
    - Operators can insert visits for their assigned customers/branches

  2. Security
    - Maintains RLS protection
    - Allows admin full access
    - Operators restricted to their assignments
*/

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON visits;

-- Create new simple INSERT policy
CREATE POLICY "Allow authenticated users to insert visits"
  ON visits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Admin can insert anything
    auth.email() = 'admin@ilaclamatik.com'
    OR
    -- Operators can insert for their assigned customers/branches
    EXISTS (
      SELECT 1
      FROM operators o
      WHERE o.auth_id = auth.uid()
        AND o.id = visits.operator_id
        AND (
          o.assigned_customers IS NULL
          OR o.assigned_customers = '{}'
          OR visits.customer_id = ANY(o.assigned_customers)
        )
        AND (
          o.assigned_branches IS NULL
          OR o.assigned_branches = '{}'
          OR visits.branch_id IS NULL
          OR visits.branch_id = ANY(o.assigned_branches)
        )
    )
  );
