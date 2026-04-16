/*
  # Operatör Haftalık KM Tablosu

  1. Yeni Tablo
    - `operator_weekly_km`
      - `id` (uuid, primary key)
      - `operator_id` (uuid, foreign key -> operators)
      - `week_number` (integer) - Yılın kaçıncı haftası
      - `year` (integer) - Yıl
      - `start_km` (numeric) - Hafta başı km
      - `end_km` (numeric) - Hafta sonu km
      - `total_km` (numeric) - Toplam haftalık km
      - `submitted_at` (timestamptz) - Gönderim zamanı
      - `created_at` (timestamptz)

  2. Güvenlik
    - RLS etkin
    - Operatörler sadece kendi kayıtlarını görebilir ve ekleyebilir
    - Public insert izni (operatör kontrolü WITH CHECK ile)

  3. İndeksler
    - Operatör ID + hafta + yıl için unique constraint
    - Haftalık sorgular için index
*/

CREATE TABLE IF NOT EXISTS operator_weekly_km (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  year integer NOT NULL,
  start_km numeric(10,2) NOT NULL,
  end_km numeric(10,2) NOT NULL,
  total_km numeric(10,2) NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_operator_week UNIQUE (operator_id, week_number, year),
  CONSTRAINT valid_km_values CHECK (end_km > start_km),
  CONSTRAINT valid_total_km CHECK (total_km = end_km - start_km)
);

CREATE INDEX IF NOT EXISTS idx_operator_weekly_km_operator ON operator_weekly_km(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_weekly_km_week ON operator_weekly_km(year, week_number);
CREATE INDEX IF NOT EXISTS idx_operator_weekly_km_submitted ON operator_weekly_km(submitted_at);

ALTER TABLE operator_weekly_km ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operatörler kendi km kayıtlarını görür"
  ON operator_weekly_km
  FOR SELECT
  TO authenticated
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Operatörler kendi km kayıtlarını ekler"
  ON operator_weekly_km
  FOR INSERT
  TO authenticated
  WITH CHECK (
    operator_id IN (
      SELECT id FROM operators WHERE auth_id = auth.uid()
    )
  );
