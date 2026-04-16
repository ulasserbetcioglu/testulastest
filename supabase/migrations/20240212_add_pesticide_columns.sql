-- Add columns for approved pesticide list
ALTER TABLE biocidal_products
ADD COLUMN IF NOT EXISTS concentration TEXT,
ADD COLUMN IF NOT EXISTS target_pest TEXT,
ADD COLUMN IF NOT EXISTS cas_no TEXT,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;

-- Comment on columns for clarity
COMMENT ON COLUMN biocidal_products.concentration IS 'Konsantrasyon bilgisi (örn: %20)';
COMMENT ON COLUMN biocidal_products.target_pest IS 'Hedef zararlı (örn: Sivrisinek Larvası)';
COMMENT ON COLUMN biocidal_products.cas_no IS 'CAS Numarası';
COMMENT ON COLUMN biocidal_products.manufacturer IS 'Üretici Firma';
