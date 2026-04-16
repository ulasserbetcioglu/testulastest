/*
  # Create IPM Contracts Table

  1. New Tables
    - `ipm_contracts`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `branch_id` (uuid, nullable, references branches)
      - `customer_name` (text) - Customer/branch display name
      - `customer_address` (text)
      - `customer_city` (text)
      - `responsible_person` (text) - IPM sorumlusu at the customer site
      - `contract_firm_name` (text) - Contracted pest control firm name
      - `contract_firm_phone` (text)
      - `contract_firm_email` (text)
      - `contract_firm_contact` (text) - Contact person at contracted firm
      - `start_date` (date) - Program start date
      - `revision_date` (date, nullable)
      - `revision_number` (integer, default 0)
      - `routine_frequency` (text) - e.g., "ayda 4 kez"
      - `target_pests` (jsonb) - Selected pest categories
      - `scope_areas` (jsonb) - Selected scope areas
      - `custom_notes` (text)
      - `status` (text) - active/draft/archived
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ipm_contracts` table
    - Add policies for authenticated users and anon access for customer/branch viewing
*/

CREATE TABLE IF NOT EXISTS ipm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  customer_address text DEFAULT '',
  customer_city text DEFAULT '',
  responsible_person text DEFAULT '',
  contract_firm_name text DEFAULT 'SİSTEM İLAÇLAMA SAN. VE TİC. LTD. ŞTİ.',
  contract_firm_phone text DEFAULT '444 7 320',
  contract_firm_email text DEFAULT 'info@sistemilaclama.com',
  contract_firm_contact text DEFAULT '',
  start_date date DEFAULT CURRENT_DATE,
  revision_date date,
  revision_number integer DEFAULT 0,
  routine_frequency text DEFAULT 'ayda 4 kez',
  target_pests jsonb DEFAULT '{"kemirgenler": true, "sinekler": true, "depolanmis_urun": true, "bocekler": true, "diger_uckunlar": false, "kuslar": false, "diger_zararlilar": false, "dogal_yasam": false}'::jsonb,
  scope_areas jsonb DEFAULT '["İşletme Geneli"]'::jsonb,
  custom_notes text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ipm_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ipm_contracts"
  ON ipm_contracts FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ipm_contracts"
  ON ipm_contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ipm_contracts"
  ON ipm_contracts FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ipm_contracts"
  ON ipm_contracts FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can view ipm_contracts"
  ON ipm_contracts FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ipm_contracts_customer_id ON ipm_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_ipm_contracts_branch_id ON ipm_contracts(branch_id);
CREATE INDEX IF NOT EXISTS idx_ipm_contracts_status ON ipm_contracts(status);
