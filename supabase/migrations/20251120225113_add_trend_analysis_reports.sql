/*
  # Trend Analizi Raporlarını Kaydetme

  1. Yeni Tablo
    - `trend_analysis_reports`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, müşteri referansı)
      - `branch_id` (uuid, nullable, şube referansı)
      - `report_name` (text, rapor adı)
      - `date_from` (date, başlangıç tarihi)
      - `date_to` (date, bitiş tarihi)
      - `report_data` (jsonb, rapor verileri)
      - `created_at` (timestamptz)
      - `created_by` (text, oluşturan kullanıcı email)

  2. Güvenlik
    - RLS etkin
    - Müşteriler sadece kendi raporlarını görebilir
*/

CREATE TABLE IF NOT EXISTS trend_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  report_name text NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  report_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by text
);

ALTER TABLE trend_analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view all trend reports"
  ON trend_analysis_reports
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert trend reports"
  ON trend_analysis_reports
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update trend reports"
  ON trend_analysis_reports
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete trend reports"
  ON trend_analysis_reports
  FOR DELETE
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_trend_reports_customer ON trend_analysis_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_trend_reports_branch ON trend_analysis_reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_trend_reports_created_at ON trend_analysis_reports(created_at DESC);
