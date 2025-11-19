# Storage Bucket Kurulum Talimatları

## 🔴 ÖNEMLİ: Storage Bucket Oluşturma

Döküman sistemi çalışması için Supabase'de storage bucket oluşturmanız gerekiyor.

## Manuel Kurulum Adımları

### 1. Supabase Dashboard'a Gidin
1. [Supabase Dashboard](https://supabase.com/dashboard) → Projenize gidin
2. Sol menüden **Storage** sekmesine tıklayın

### 2. Documents Bucket Oluşturun

**Bucket Ayarları:**
```
Name: documents
Public: ✓ Yes (checked)
File size limit: 10 MB
Allowed MIME types:
  - application/pdf
  - image/jpeg
  - image/png
  - image/jpg
  - application/msword
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

**Adımlar:**
1. "New Bucket" butonuna tıklayın
2. Name alanına: `documents` yazın
3. "Public bucket" checkbox'ını işaretleyin
4. "Save" butonuna tıklayın

### 3. Bucket Policies (Opsiyonel - Otomatik Oluşturulabilir)

Supabase otomatik olarak public bucket için temel policy'ler oluşturur. Ancak özel policy'ler için:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow admin to delete
CREATE POLICY "Allow admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.email() = 'admin@ilaclamatik.com'
);
```

### 4. Company Assets Bucket (Opsiyonel)

Logo ve diğer firma görselleri için:

**Bucket Ayarları:**
```
Name: company-assets
Public: ✓ Yes (checked)
File size limit: 10 MB
Allowed MIME types:
  - image/jpeg
  - image/png
  - image/jpg
  - image/svg+xml
```

## Bucket Oluşturma SQL (Alternatif)

Eğer SQL Editor kullanmak isterseniz:

```sql
-- Create documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create company-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;
```

## Test

Bucket oluşturulduktan sonra:

1. Admin olarak giriş yapın
2. Dökümanlar sayfasına gidin (`/dokumanlar`)
3. "Döküman Yükle" butonuna tıklayın
4. Bir PDF veya resim dosyası yükleyin
5. Yüklenen dökümanı görebilir, indirebilir ve silebilirsiniz

## Sorun Giderme

### "Bucket not found" Hatası
- Bucket'ın adının tam olarak `documents` olduğundan emin olun
- Bucket'ın "Public" olarak işaretlendiğinden emin olun

### "Unauthorized" Hatası
- Giriş yaptığınızdan emin olun
- Admin kullanıcısı iseniz email'inizin `admin@ilaclamatik.com` olduğundan emin olun

### Dosya Yüklenmiyor
- Dosya boyutunun 10MB'dan küçük olduğundan emin olun
- Dosya türünün desteklendiğinden emin olun (PDF, JPEG, PNG, DOC, DOCX)
