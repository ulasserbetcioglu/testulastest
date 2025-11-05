/*
  # Add certificates table
  
  1. New Tables
    - `certificates`: Store training certificates
    
  2. Security
    - Enable RLS
    - Add policies for admin and operators
*/

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text NOT NULL,
  participant_name text NOT NULL,
  training_date date NOT NULL,
  training_title text NOT NULL,
  instructor_name text NOT NULL,
  instructor_title text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  pdf_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON certificates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for admin and operators"
  ON certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() = 'admin@ilaclamatik.com' OR
    EXISTS (
      SELECT 1 FROM operators
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Enable update access for admin"
  ON certificates
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable delete access for admin"
  ON certificates
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS certificates_customer_id_idx ON certificates(customer_id);
CREATE INDEX IF NOT EXISTS certificates_branch_id_idx ON certificates(branch_id);
CREATE INDEX IF NOT EXISTS certificates_training_date_idx ON certificates(training_date);