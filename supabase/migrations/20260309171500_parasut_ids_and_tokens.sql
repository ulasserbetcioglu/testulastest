-- Paraşüt Eşleştirme Alanları ve Ayarların Güncellenmesi

-- 1. Eşleştirme Alanları (integer id'ler Paraşüt V4 için gereklidir)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS parasut_id integer;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS parasut_id integer;
ALTER TABLE public.paid_products ADD COLUMN IF NOT EXISTS parasut_id integer;
ALTER TABLE public.biocidal_products ADD COLUMN IF NOT EXISTS parasut_id integer;

-- 2. Mevcut Ayarları Alınan Tokenlar ve Firma ID ile Güncelle (Eğer yoksa Insert)
/* 
INSERT INTO public.parasut_settings (id, access_token, refresh_token, company_id, expires_at, client_id, client_secret, redirect_uri)
VALUES (
    1, 
    'ra0HYKsqkCVysUU1yEnbN1OV6CNGaaSpKKBnpZT9kfc', 
    'AnYAyEjXgXg5p_gcjxzAEiY0fLVjm_SsM1e0MhtajJc', 
    '510255', 
    '2026-03-09T22:09:26Z',
    'Pk2zANUd0fFMIo92jeOjizr-66cFicnL2gMlpKiERXc',
    'LnSy-oYpQF8p9YAYsYarKMnfwsni0-jx2HBlD9eSekg',
    'urn:ietf:wg:oauth:2.0:oob'
)
ON CONFLICT (id) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    company_id = EXCLUDED.company_id,
    expires_at = EXCLUDED.expires_at,
    client_id = EXCLUDED.client_id,
    client_secret = EXCLUDED.client_secret,
    redirect_uri = EXCLUDED.redirect_uri;
*/

-- Not: Eğer parasut_settings tablosu henüz oluşmadıysa (migration çalışmadıysa) 
-- Bu komut hata verebilir. Kullanıcının SQL Editor'de her iki migration'ı da çalıştırması gerekecek.
