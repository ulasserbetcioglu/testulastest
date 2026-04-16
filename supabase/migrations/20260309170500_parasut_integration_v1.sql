-- Paraşüt API Entegrasyonu İçin Gerekli Tablolar ve Politikalar

-- 1. Paraşüt Ayarları Tablosu
CREATE TABLE IF NOT EXISTS public.parasut_settings (
    id integer PRIMARY KEY DEFAULT 1,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    access_token text,
    refresh_token text,
    expires_at timestamp with time zone,
    company_id text,
    username text, -- Bazen OAuth yerine direkt şifre flowu gerekebilir
    password text,
    redirect_uri text DEFAULT 'urn:ietf:wg:oauth:2.0:oob',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- 2. Paraşüt Fatura Takip Tablosu
CREATE TABLE IF NOT EXISTS public.parasut_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL CHECK (source_type IN ('monthly_plan', 'material_sale', 'offer', 'visit')),
    source_id uuid NOT NULL,
    parasut_id integer,
    parasut_number text,
    status text DEFAULT 'draft', -- draft, sent, paid, cancelled
    total_amount decimal(12,2),
    items jsonb, -- Fatura kalemlerinin bir yedeği
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Paraşüt Log Tablosu
CREATE TABLE IF NOT EXISTS public.parasut_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level text DEFAULT 'info',
    message text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS Politikaları
ALTER TABLE public.parasut_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parasut_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parasut_logs ENABLE ROW LEVEL SECURITY;

-- Sadece Admin'in (veya backend servisinin) bu tabloları görmesine izin ver
-- Not: admin@ilaclamatik.com emailini baz alıyoruz
CREATE POLICY "Admin full access on parasut_settings" ON public.parasut_settings
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com');

CREATE POLICY "Admin full access on parasut_invoices" ON public.parasut_invoices
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com');

CREATE POLICY "Admin full access on parasut_logs" ON public.parasut_logs
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com');

-- Servis rolü için (Edge Functions) otomatik erişim zaten var, ancak RLS'yi aşmak için gerekebilir.
-- Genelde Edge Functions service_role kullanır.

-- Tetikleyici: updated_at alanlarını güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parasut_settings_updated_at BEFORE UPDATE ON public.parasut_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parasut_invoices_updated_at BEFORE UPDATE ON public.parasut_invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
