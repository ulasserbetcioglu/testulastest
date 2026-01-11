# Mentor Modülü Storage Kurulumu

Mentor modülü için doküman yükleme özelliğini kullanabilmek için aşağıdaki adımları takip edin:

## 1. Storage Bucket Oluşturma

Supabase Dashboard'da:
1. Storage bölümüne gidin
2. "Create a new bucket" butonuna tıklayın
3. Bucket adı: `mentor-documents`
4. Public bucket olarak işaretleyin
5. "Create bucket" butonuna tıklayın

## 2. Storage Policies (RLS) Ayarlama

`mentor-documents` bucket'ı için aşağıdaki policy'leri ekleyin:

### Policy 1: Public Read Access
```sql
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'mentor-documents' );
```

### Policy 2: Authenticated Upload
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'mentor-documents' );
```

### Policy 3: Authenticated Delete
```sql
CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'mentor-documents' );
```

## 3. Dosya Yapısı

Dosyalar şu şekilde organize edilir:
```
mentor-documents/
  ├── {customer_id}/
  │   ├── 1.1/          # Faaliyet Dosyası İçeriği
  │   ├── 3.3/          # Fumigasyon Ruhsatı
  │   ├── 4.3/          # Trend Analiz
  │   ├── 4.4/          # Sigorta Poliçesi
  │   ├── 4.5/          # Şikayet/Öneri
  │   ├── 4.6/          # Acil Çağrı
  │   ├── 5.1/          # Faaliyet Raporu
  │   ├── 5.3/          # Kullanım Kartı
  │   ├── 5.4/          # Ruhsat & MSDS
  │   ├── 5.5/          # Ürün Grupları
  │   └── 6.1/          # Atık İmha
```

## 4. Desteklenen Dosya Formatları

- PDF (.pdf)
- Word (.doc, .docx)
- Görsel (.jpg, .jpeg, .png)

## 5. Kullanım

Her modülde:
1. "Dosya Yükle" butonuna tıklayın
2. İlgili belgeyi seçin
3. Yüklenen belgeler liste halinde görünür
4. Belgeyi görüntülemek için üzerine tıklayın
5. Silmek için çöp kutusu ikonuna tıklayın

## Not

Storage bucket oluşturulduktan sonra uygulama otomatik olarak doküman yükleme özelliğini kullanmaya başlayacaktır.
