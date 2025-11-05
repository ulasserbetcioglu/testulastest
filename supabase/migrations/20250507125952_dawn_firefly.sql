/*
  # Create visits table and related schemas
  
  1. New Tables
    - `visits`
      - Track customer visits
      - Store visit details and status
      
  2. Security
    - Enable RLS
    - Add policies for operators and admin
*/

CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('planned', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Policies for visits table
CREATE POLICY "Enable read access for authenticated users"
  ON visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON visits FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth_id FROM operators WHERE id = visits.operator_id
  ) OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for authenticated users"
  ON visits FOR DELETE
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth_id FROM operators WHERE id = visits.operator_id
  ) OR auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX visits_customer_id_idx ON visits(customer_id);
CREATE INDEX visits_branch_id_idx ON visits(branch_id);
CREATE INDEX visits_operator_id_idx ON visits(operator_id);
CREATE INDEX visits_visit_date_idx ON visits(visit_date);
CREATE INDEX visits_status_idx ON visits(status);