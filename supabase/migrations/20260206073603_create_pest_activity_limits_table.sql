/*
  # Zararlı Aktivitesi Kritik Limitleri & Aksiyon Planı Tablosu

  1. Yeni Tablolar
    - `pest_activity_limits`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, customers tablosuna FK)
      - `branch_id` (uuid, branches tablosuna FK, nullable - şube seviyesi veya müşteri seviyesi)
      - `customer_name` (text, müşteri/şube adı)
      - `responsible_company` (text, sorumlu firma)
      - `document_number` (text, doküman numarası)
      - `revision_number` (integer, revizyon numarası)
      - `revision_date` (date, revizyon tarihi)
      - `pest_rows` (jsonb, zararlı satırları ve kritik limitleri)
      - `status` (text, aktif/taslak/arşiv)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Güvenlik
    - RLS aktif
    - Authenticated kullanıcılar CRUD
    - Anon kullanıcılar sadece okuma (müşteri portalı için)
*/

CREATE TABLE IF NOT EXISTS pest_activity_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  customer_name text NOT NULL DEFAULT '',
  responsible_company text DEFAULT '',
  document_number text DEFAULT '',
  revision_number integer DEFAULT 0,
  revision_date date,
  pest_rows jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pest_activity_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pest_activity_limits"
  ON pest_activity_limits FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pest_activity_limits"
  ON pest_activity_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pest_activity_limits"
  ON pest_activity_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pest_activity_limits"
  ON pest_activity_limits FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon users can view pest_activity_limits"
  ON pest_activity_limits FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pest_activity_limits_customer ON pest_activity_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_pest_activity_limits_branch ON pest_activity_limits(branch_id);
CREATE INDEX IF NOT EXISTS idx_pest_activity_limits_status ON pest_activity_limits(status);
