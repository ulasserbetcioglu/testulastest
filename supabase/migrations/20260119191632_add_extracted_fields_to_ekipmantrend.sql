/*
  # Add Extracted Fields to ekipmantrend

  1. New Columns
    - `aktivite_var` (boolean) - Genel aktivite durumu
    - `kirik` (boolean) - Kırık ekipman
    - `kayip` (boolean) - Kayıp ekipman
    - `tuketim_var` (boolean) - Tüketim var mı
    - `ari_sayisi` (integer) - Arı sayısı
    - `karasinek_sayisi` (integer) - Karasinek sayısı
    - `sivrisinek_sayisi` (integer) - Sivrisinek sayısı
    - `diger_sayisi` (integer) - Diğer haşere sayısı
    - `toplam_sayi` (integer) - Toplam yakalanan sayısı
    - `status` (text) - Durum bilgisi
    - `equipment_name` (text) - Ekipman adı

  2. Changes
    - JSONB'den sık kullanılan alanları text/boolean/integer kolonlara çıkar
    - Trigger'ı güncelle: yeni insert/update'lerde bu alanları otomatik doldur
    - Mevcut verileri güncelle

  3. Benefits
    - Daha hızlı sorgular (index kullanımı)
    - Kolay filtreleme ve gruplama
    - SQL ile direkt erişim
*/

-- 1. Yeni kolonları ekle
ALTER TABLE ekipmantrend
ADD COLUMN IF NOT EXISTS equipment_name text,
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS aktivite_var boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kirik boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kayip boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tuketim_var boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ari_sayisi integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS karasinek_sayisi integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sivrisinek_sayisi integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS diger_sayisi integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS toplam_sayi integer DEFAULT 0;

-- 2. İndeksler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_aktivite ON ekipmantrend(aktivite_var) WHERE aktivite_var = true;
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_kirik ON ekipmantrend(kirik) WHERE kirik = true;
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_kayip ON ekipmantrend(kayip) WHERE kayip = true;
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_status ON ekipmantrend(status);
CREATE INDEX IF NOT EXISTS idx_ekipmantrend_equipment_name ON ekipmantrend(equipment_name);

-- 3. Trigger fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION sync_equipment_checks_to_ekipmantrend()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old entries for this visit
  DELETE FROM ekipmantrend WHERE visit_id = NEW.id;

  -- Insert new entries if equipment_checks exists
  IF NEW.equipment_checks IS NOT NULL AND jsonb_typeof(NEW.equipment_checks) = 'object' THEN
    INSERT INTO ekipmantrend (
      visit_id,
      equipment_key,
      equipment_data,
      branch_id,
      visit_date,
      operator_id,
      equipment_name,
      status,
      aktivite_var,
      kirik,
      kayip,
      tuketim_var,
      ari_sayisi,
      karasinek_sayisi,
      sivrisinek_sayisi,
      diger_sayisi,
      toplam_sayi
    )
    SELECT
      NEW.id,
      equipment_entry.key,
      equipment_entry.value,
      NEW.branch_id,
      NEW.visit_date,
      NEW.operator_id,
      -- Extract common fields
      COALESCE(equipment_entry.value->>'equipment_name', equipment_entry.value->>'name', ''),
      COALESCE(equipment_entry.value->>'status', equipment_entry.value->>'durum', ''),
      -- aktivite_var: check multiple possible fields
      COALESCE(
        (equipment_entry.value->>'aktivite')::boolean,
        (equipment_entry.value->>'aktivite_var')::boolean,
        (equipment_entry.value->>'activity')::boolean,
        CASE WHEN equipment_entry.value->>'aktivite' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
      ),
      -- kirik
      COALESCE(
        (equipment_entry.value->>'kirik')::boolean,
        (equipment_entry.value->>'kırık')::boolean,
        CASE WHEN equipment_entry.value->>'kirik' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
      ),
      -- kayip
      COALESCE(
        (equipment_entry.value->>'kayip')::boolean,
        (equipment_entry.value->>'kayıp')::boolean,
        CASE WHEN equipment_entry.value->>'kayip' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
      ),
      -- tuketim_var
      COALESCE(
        (equipment_entry.value->>'tuketim')::boolean,
        (equipment_entry.value->>'tuketim_var')::boolean,
        CASE WHEN equipment_entry.value->>'tuketim' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
      ),
      -- ari_sayisi
      COALESCE(
        (equipment_entry.value->>'ariSayisi')::integer,
        (equipment_entry.value->>'ari_sayisi')::integer,
        0
      ),
      -- karasinek_sayisi
      COALESCE(
        (equipment_entry.value->>'karasinekSayisi')::integer,
        (equipment_entry.value->>'karasinek_sayisi')::integer,
        0
      ),
      -- sivrisinek_sayisi
      COALESCE(
        (equipment_entry.value->>'sivrisinekSayisi')::integer,
        (equipment_entry.value->>'sivrisinek_sayisi')::integer,
        0
      ),
      -- diger_sayisi
      COALESCE(
        (equipment_entry.value->>'digerSayisi')::integer,
        (equipment_entry.value->>'diger_sayisi')::integer,
        0
      ),
      -- toplam_sayi: sum of all counts
      COALESCE((equipment_entry.value->>'ariSayisi')::integer, 0) +
      COALESCE((equipment_entry.value->>'karasinekSayisi')::integer, 0) +
      COALESCE((equipment_entry.value->>'sivrisinekSayisi')::integer, 0) +
      COALESCE((equipment_entry.value->>'digerSayisi')::integer, 0)
    FROM jsonb_each(NEW.equipment_checks) as equipment_entry;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Mevcut verileri güncelle
UPDATE ekipmantrend SET
  equipment_name = COALESCE(equipment_data->>'equipment_name', equipment_data->>'name', ''),
  status = COALESCE(equipment_data->>'status', equipment_data->>'durum', ''),
  aktivite_var = COALESCE(
    (equipment_data->>'aktivite')::boolean,
    (equipment_data->>'aktivite_var')::boolean,
    (equipment_data->>'activity')::boolean,
    CASE WHEN equipment_data->>'aktivite' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
  ),
  kirik = COALESCE(
    (equipment_data->>'kirik')::boolean,
    (equipment_data->>'kırık')::boolean,
    CASE WHEN equipment_data->>'kirik' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
  ),
  kayip = COALESCE(
    (equipment_data->>'kayip')::boolean,
    (equipment_data->>'kayıp')::boolean,
    CASE WHEN equipment_data->>'kayip' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
  ),
  tuketim_var = COALESCE(
    (equipment_data->>'tuketim')::boolean,
    (equipment_data->>'tuketim_var')::boolean,
    CASE WHEN equipment_data->>'tuketim' IN ('var', 'evet', 'true', 'Var') THEN true ELSE false END
  ),
  ari_sayisi = COALESCE(
    (equipment_data->>'ariSayisi')::integer,
    (equipment_data->>'ari_sayisi')::integer,
    0
  ),
  karasinek_sayisi = COALESCE(
    (equipment_data->>'karasinekSayisi')::integer,
    (equipment_data->>'karasinek_sayisi')::integer,
    0
  ),
  sivrisinek_sayisi = COALESCE(
    (equipment_data->>'sivrisinekSayisi')::integer,
    (equipment_data->>'sivrisinek_sayisi')::integer,
    0
  ),
  diger_sayisi = COALESCE(
    (equipment_data->>'digerSayisi')::integer,
    (equipment_data->>'diger_sayisi')::integer,
    0
  ),
  toplam_sayi =
    COALESCE((equipment_data->>'ariSayisi')::integer, 0) +
    COALESCE((equipment_data->>'karasinekSayisi')::integer, 0) +
    COALESCE((equipment_data->>'sivrisinekSayisi')::integer, 0) +
    COALESCE((equipment_data->>'digerSayisi')::integer, 0)
WHERE equipment_data IS NOT NULL;