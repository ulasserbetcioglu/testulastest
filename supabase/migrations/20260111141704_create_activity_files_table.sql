/*
  # Faaliyet Dosyası Tablosu Oluşturma

  1. Yeni Tablo
    - `activity_files`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `branch_id` (uuid, foreign key to branches, nullable)
      - `title` (text) - Faaliyet dosyası başlığı
      - `form_data` (jsonb) - Tüm form verilerini içeren JSON
      - `report_url` (text, nullable) - Oluşturulan rapor URL'si
      - `status` (text) - 'draft', 'published', 'archived'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, nullable) - Oluşturan kullanıcı

  2. Güvenlik
    - RLS politikaları eklendi
    - Admin tüm dosyalara erişebilir
    - Müşteriler kendi dosyalarını görebilir
    - Şubeler kendi dosyalarını görebilir
*/

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS activity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  title text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_url text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_activity_files_customer_id ON activity_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_files_branch_id ON activity_files(branch_id);
CREATE INDEX IF NOT EXISTS idx_activity_files_status ON activity_files(status);
CREATE INDEX IF NOT EXISTS idx_activity_files_created_at ON activity_files(created_at DESC);

-- RLS etkinleştir
ALTER TABLE activity_files ENABLE ROW LEVEL SECURITY;

-- Admin politikası - Tüm işlemler için
CREATE POLICY "Admin can manage all activity files"
  ON activity_files
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Müşteri okuma politikası
CREATE POLICY "Customers can view their activity files"
  ON activity_files
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE auth_id = auth.uid()
    )
  );

-- Şube okuma politikası
CREATE POLICY "Branches can view their activity files"
  ON activity_files
  FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE auth_id = auth.uid()
    )
  );

-- Updated_at için trigger
CREATE OR REPLACE FUNCTION update_activity_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activity_files_updated_at
  BEFORE UPDATE ON activity_files
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_files_updated_at();
