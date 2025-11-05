/*
  # Add risk assessment tables
  
  1. New Tables
    - `risk_assessments`: Store risk assessment information
    - `risk_items`: Store individual risk items for each assessment
    
  2. Security
    - Enable RLS
    - Add policies for admin, customers, and branches
*/

-- Create risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  assessment_date date NOT NULL,
  next_assessment_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'completed', 'expired')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create risk items table
CREATE TABLE IF NOT EXISTS risk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES risk_assessments(id) ON DELETE CASCADE,
  hazard text NOT NULL,
  risk_description text NOT NULL,
  likelihood integer NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 5),
  risk_level integer NOT NULL,
  existing_controls text,
  additional_controls text,
  responsible text,
  target_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_items ENABLE ROW LEVEL SECURITY;

-- Create policies for risk_assessments
CREATE POLICY "Enable read access for authenticated users"
  ON risk_assessments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON risk_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for admin"
  ON risk_assessments
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com' OR auth.uid() = created_by);

CREATE POLICY "Enable delete access for admin"
  ON risk_assessments
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create policies for risk_items
CREATE POLICY "Enable read access for authenticated users"
  ON risk_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON risk_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for admin"
  ON risk_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() = 'admin@ilaclamatik.com' OR 
    EXISTS (
      SELECT 1 FROM risk_assessments
      WHERE risk_assessments.id = risk_items.assessment_id
      AND risk_assessments.created_by = auth.uid()
    )
  );

CREATE POLICY "Enable delete access for admin"
  ON risk_items
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create customer access policy
CREATE POLICY "Enable customer access to own risk assessments"
  ON risk_assessments
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own risk assessments
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = risk_assessments.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see risk assessments for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = risk_assessments.branch_id
      AND branches.auth_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS risk_assessments_customer_id_idx ON risk_assessments(customer_id);
CREATE INDEX IF NOT EXISTS risk_assessments_branch_id_idx ON risk_assessments(branch_id);
CREATE INDEX IF NOT EXISTS risk_assessments_assessment_date_idx ON risk_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS risk_assessments_next_assessment_date_idx ON risk_assessments(next_assessment_date);
CREATE INDEX IF NOT EXISTS risk_assessments_status_idx ON risk_assessments(status);

CREATE INDEX IF NOT EXISTS risk_items_assessment_id_idx ON risk_items(assessment_id);
CREATE INDEX IF NOT EXISTS risk_items_risk_level_idx ON risk_items(risk_level);
CREATE INDEX IF NOT EXISTS risk_items_status_idx ON risk_items(status);