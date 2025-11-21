/*
  # Aylık Ziyaret Planları Tablosu

  ## Açıklama
  Müşteri ve şubelere ay bazında kaç ziyaret yapılması gerektiğini tanımlayan tablo.
  Her müşteri veya şube için ay ay ziyaret sayıları belirlenebilir.

  ## Yeni Tablolar
  - `monthly_visit_schedules`
    - `id` (uuid, primary key)
    - `customer_id` (uuid, nullable) - Müşteri bazlı plan için
    - `branch_id` (uuid, nullable) - Şube bazlı plan için
    - `month` (integer, 1-12) - Ay numarası
    - `year` (integer, nullable) - Yıl (null ise her yıl geçerli)
    - `visits_required` (integer) - O ay kaç ziyaret gerekli
    - `notes` (text, nullable) - Notlar
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Kısıtlamalar
  - customer_id VEYA branch_id dolu olmalı (ikisi birden boş olamaz)
  - visits_required 0'dan büyük olmalı

  ## Güvenlik
  - RLS enabled
  - Admin tüm işlemleri yapabilir
  - Operatör okuyabilir
*/

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS monthly_visit_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer CHECK (year >= 2020 AND year <= 2100),
  visits_required integer NOT NULL CHECK (visits_required > 0) DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- En az biri dolu olmalı
  CONSTRAINT check_customer_or_branch CHECK (
    customer_id IS NOT NULL OR branch_id IS NOT NULL
  )
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_monthly_visit_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_monthly_visit_schedules_updated_at ON monthly_visit_schedules;
CREATE TRIGGER update_monthly_visit_schedules_updated_at
  BEFORE UPDATE ON monthly_visit_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_visit_schedules_updated_at();

-- RLS politikaları
ALTER TABLE monthly_visit_schedules ENABLE ROW LEVEL SECURITY;

-- Admin tüm işlemleri yapabilir
CREATE POLICY "Admin can do everything on schedules"
  ON monthly_visit_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@ilaclamatik.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'admin@ilaclamatik.com'
    )
  );

-- Operatör okuyabilir
CREATE POLICY "Operators can view schedules"
  ON monthly_visit_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operators
      WHERE operators.auth_id = auth.uid()
    )
  );

-- Müşteri kendi planlarını görebilir
CREATE POLICY "Customers can view their schedules"
  ON monthly_visit_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.auth_id = auth.uid()
      AND (
        c.id = monthly_visit_schedules.customer_id
        OR EXISTS (
          SELECT 1 FROM branches b
          WHERE b.id = monthly_visit_schedules.branch_id
          AND b.customer_id = c.id
        )
      )
    )
  );

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_customer ON monthly_visit_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_branch ON monthly_visit_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_month_year ON monthly_visit_schedules(month, year);
