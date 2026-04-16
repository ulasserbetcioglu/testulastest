-- Add parasut_invoice_note to company_settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'parasut_invoice_note'
    ) THEN
        ALTER TABLE company_settings ADD COLUMN parasut_invoice_note text DEFAULT 'MÜŞTERİ GÜNCEL BAKİYESİ: {BALANCE} TL\n\nÖDEME BİLGİLERİ:\nBanka: Garanti BBVA\nIBAN: TR66 0006 2000 0370 0006 2027 89';
    END IF;
END $$;
