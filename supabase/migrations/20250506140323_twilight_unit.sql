/*
  # Admin yetkilendirmeleri için güncelleme

  1. Değişiklikler
    - Admin kullanıcısı için özel politikalar ekleme
    - Müşteri tablosu için tam erişim yetkisi
    
  2. Güvenlik
    - Sadece admin@ilaclamatik.com için özel yetkiler
    - Diğer kullanıcılar için mevcut kısıtlamalar devam edecek
*/

-- Admin için özel politika oluşturma
CREATE POLICY "Enable full access for admin user" ON customers
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com')
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');