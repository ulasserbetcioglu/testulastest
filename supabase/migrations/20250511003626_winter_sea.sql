/*
  # Add corrective actions table
  
  1. New Tables
    - `corrective_actions`
      - Track corrective and preventive actions
      - Link to visits, customers, and branches
      
  2. Security
    - Enable RLS
    - Add policies for operators and admin
*/

-- Create corrective actions table
CREATE TABLE IF NOT EXISTS corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  non_compliance_type text NOT NULL,
  non_compliance_description text NOT NULL,
  root_cause_analysis text NOT NULL,
  corrective_action text NOT NULL,
  preventive_action text NOT NULL,
  responsible text NOT NULL,
  due_date date NOT NULL,
  completion_date date,
  related_standard text,
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'verified')),
  verification_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON corrective_actions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON corrective_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON corrective_actions
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR
    auth.uid() = created_by
  );

CREATE POLICY "Enable delete access for admin"
  ON corrective_actions
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS corrective_actions_visit_id_idx ON corrective_actions(visit_id);
CREATE INDEX IF NOT EXISTS corrective_actions_customer_id_idx ON corrective_actions(customer_id);
CREATE INDEX IF NOT EXISTS corrective_actions_branch_id_idx ON corrective_actions(branch_id);
CREATE INDEX IF NOT EXISTS corrective_actions_status_idx ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS corrective_actions_due_date_idx ON corrective_actions(due_date);