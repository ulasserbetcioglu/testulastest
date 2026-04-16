/*
  # Aylık Ziyaret Planlarına Operatör Ataması

  ## Değişiklikler
  - `monthly_visit_schedules` tablosuna `operator_id` sütunu eklenir
  - Hangi operatörün hangi müşteri/şubeyle ilgilendiği takip edilir

  ## Yeni Sütunlar
  - `operator_id` (uuid, nullable) - Sorumlu operatör
*/

-- Operatör sütunu ekle
ALTER TABLE monthly_visit_schedules
ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_monthly_visit_schedules_operator 
ON monthly_visit_schedules(operator_id);

-- Mevcut verileri güncelle (opsiyonel - ilk operatörü varsayılan olarak atar)
-- Bunu kaldırabilirsiniz, sadece migration çalışması için
COMMENT ON COLUMN monthly_visit_schedules.operator_id IS 'Sorumlu operatör ID';
