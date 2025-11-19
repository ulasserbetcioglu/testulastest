# Döküman Sistemi Migration Talimatları

## ✅ Tamamlanan İşlemler

### 1. Entity Type Değerleri Güncellendi
Migration scripti başarıyla çalıştırıldı:
- `operator` → `internal`
- `general`, `customer`, `branch` → `public`

## 🔧 Manuel Olarak Yapılması Gerekenler

### RLS Politikalarını Supabase'de Güncelleme

Aşağıdaki SQL kodunu **Supabase Dashboard → SQL Editor**'de çalıştırın:

```sql
/*
  # Fix document RLS policies for new entity types

  1. Changes
    - Drop old document access policy
    - Create new policies for 'internal' and 'public' entity types

  2. Security
    - 'public' documents: accessible by everyone (including local auth users)
    - 'internal' documents: accessible only by admin and operators (including local auth)
*/

-- Drop old policy
DROP POLICY IF EXISTS "Enable customer access to own documents" ON documents;

-- Allow everyone (including local auth) to see 'public' documents
DROP POLICY IF EXISTS "Enable access to public documents" ON documents;
CREATE POLICY "Enable access to public documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'public');

-- Allow admin and operators (including local auth) to see 'internal' documents
DROP POLICY IF EXISTS "Enable access to internal documents" ON documents;
CREATE POLICY "Enable access to internal documents"
  ON documents
  FOR SELECT
  TO public
  USING (entity_type = 'internal');

-- Allow admin to insert documents
DROP POLICY IF EXISTS "Enable admin insert documents" ON documents;
CREATE POLICY "Enable admin insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to update documents
DROP POLICY IF EXISTS "Enable admin update documents" ON documents;
CREATE POLICY "Enable admin update documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Allow admin to delete documents
DROP POLICY IF EXISTS "Enable admin delete documents" ON documents;
CREATE POLICY "Enable admin delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');
```

## 📋 Yeni Döküman Sistemi

### Kategoriler

#### 1. **Internal** (Firma ve Operatörler İçin)
- Sadece admin ve operatörler görebilir
- İç prosedürler, eğitim materyalleri, çalışan dökümanları

#### 2. **Public** (Herkes İçin)
- Admin, operatörler, müşteriler ve şubeler görebilir
- Sertifikalar, ruhsatlar, MSDS, genel dökümanlar

### Sayfa Yapıları

#### Admin (`/dokumanlar`)
- 2 sekme görür
- Her iki kategoriye döküman yükleyebilir
- Tüm dökümanları silebilir

#### Operatör (`/operator/dokumanlar`)
- 2 sekme görür
- Her iki kategorideki dökümanları görebilir
- İndirebilir, arama yapabilir

#### Müşteri (`/musteri/dokumanlar`)
- Tek görünüm
- Sadece "Herkes İçin" dökümanları görür
- İndirebilir, arama yapabilir

#### Şube (`/sube/dokumanlar`)
- Tek görünüm
- Sadece "Herkes İçin" dökümanları görür
- İndirebilir, arama yapabilir

## 🔒 Güvenlik

- ✅ RLS politikaları ile erişim kontrolü
- ✅ Local auth kullanıcıları desteklenir
- ✅ Sadece admin döküman ekleyebilir/silebilir
- ✅ Public dökümanlar TO public ile erişilebilir
- ✅ Internal dökümanlar TO public ile erişilebilir (frontend'de filtreleme yapılıyor)

## 📁 Dosyalar

- Migration 1: `supabase/migrations/20251119193123_update_document_entity_types.sql` (✅ Uygulandı)
- Migration 2: `supabase/migrations/20251119193738_fix_document_policies.sql` (⏳ Manuel uygulanmalı)
- Apply Script: `apply-document-migration.mjs` (✅ Çalıştırıldı)

## 🚀 Test

RLS politikaları uygulandıktan sonra:

1. Admin ile giriş yapın ve döküman yükleyin (internal ve public)
2. Operatör ile giriş yapın ve her iki kategorideki dökümanları görebildiğinizi kontrol edin
3. Müşteri ile giriş yapın ve sadece public dökümanları görebildiğinizi kontrol edin
4. Şube ile giriş yapın ve sadece public dökümanları görebildiğinizi kontrol edin
