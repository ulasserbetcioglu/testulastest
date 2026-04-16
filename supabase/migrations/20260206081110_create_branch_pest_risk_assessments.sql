/*
  # Create branch pest risk assessments table

  1. New Tables
    - `branch_pest_risk_assessments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `branch_id` (uuid, references branches)
      - `customer_name` (text) - denormalized for PDF
      - `customer_address` (text) - denormalized for PDF
      - `division` (text) - Bolum / Division
      - `assessment_date` (date)
      - `responsible_person` (text) - Repellent sorumlusu
      - `customer_responsible` (text) - Musteri sorumlusu
      - `document_number` (text) - Dokuman No
      - `revision_number` (text) - Revizyon No
      - `revision_date` (date) - Revizyon Tarihi
      - `pest_data` (jsonb) - Stores population and risk values per pest type
      - `status` (text) - active, draft, archived
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `branch_pest_risk_assessments`
    - Authenticated users can perform CRUD
    - Anonymous users can read (for customer local auth)

  3. Notes
    - pest_data JSONB structure: { "category_key": { "pest_key": { "pop": 1-5, "risk": 1-5 } } }
    - Risk score = pop * risk (calculated client-side)
*/

CREATE TABLE IF NOT EXISTS branch_pest_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  customer_name text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  division text NOT NULL DEFAULT '',
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  responsible_person text NOT NULL DEFAULT '',
  customer_responsible text NOT NULL DEFAULT '',
  document_number text NOT NULL DEFAULT '',
  revision_number text NOT NULL DEFAULT '01',
  revision_date date NOT NULL DEFAULT CURRENT_DATE,
  pest_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE branch_pest_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bpra_customer_id ON branch_pest_risk_assessments(customer_id);
CREATE INDEX IF NOT EXISTS idx_bpra_branch_id ON branch_pest_risk_assessments(branch_id);
CREATE INDEX IF NOT EXISTS idx_bpra_status ON branch_pest_risk_assessments(status);

CREATE POLICY "Authenticated users can read pest risk assessments"
  ON branch_pest_risk_assessments
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pest risk assessments"
  ON branch_pest_risk_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pest risk assessments"
  ON branch_pest_risk_assessments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pest risk assessments"
  ON branch_pest_risk_assessments
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anonymous users can read pest risk assessments"
  ON branch_pest_risk_assessments
  FOR SELECT
  TO anon
  USING (true);
