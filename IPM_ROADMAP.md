# 🎯 IPM (Entegre Zararlı Yönetimi) Yol Haritası

## 📋 Genel Bakış

Bu doküman, İlaçlamatik sisteminde profesyonel IPM hizmeti sunmak için gereken tüm modüllerin, raporların ve özelliklerin yol haritasını içerir.

---

## 📊 Mevcut Durum Analizi

### ✅ Tamamlanmış Modüller (3/28)

| # | Modül | Durum | Dosya |
|---|-------|-------|-------|
| 1 | Risk Değerlendirme | ✅ Tamamlandı | `RiskAssessmentModule.tsx` |
| 2 | Teklif/Öneri Raporu | ✅ Tamamlandı | `ProposalReportModule.tsx` |
| 3 | UV Lamba Raporu | ✅ Tamamlandı | `UvLampReport.tsx` |

### 🚧 Modüller Sayfasında Tanımlı Ama Uygulanmamış (13/28)

| # | Modül | İlgili IPM Maddesi | Öncelik |
|---|-------|-------------------|---------|
| 1 | Hizmet Planı Rapor Modülü | 4.1, 4.2 | 🔴 Yüksek |
| 2 | Tehlike ve Risk Değerlendirme | 4.13 | 🔴 Yüksek |
| 3 | Risk Eylem Planı | 4.13 | 🟡 Orta |
| 4 | Riskli Alan Belirleme | 4.13, 4.14 | 🔴 Yüksek |
| 5 | Denetim Raporu | 4.15 | 🔴 Yüksek |
| 6 | Uygunluk Kontrol | 4.15 | 🟡 Orta |
| 7 | Hizmet Sözleşmesi | 4.1 | 🔴 Yüksek |
| 8 | Ekipman Krokisi | 4.14 | 🔴 Yüksek |
| 9 | Trend Analiz | 4.18-4.22 | 🔴 Yüksek |
| 10 | Ziyaret Takvimi | 4.5 | 🟡 Orta |
| 11 | Otomatik Trend Analiz | 4.18-4.22 | 🟢 Düşük |
| 12 | Eğitim Sunumu | 4.28 | 🟡 Orta |
| 13 | Eğitim Sertifikası | 4.28 | 🟡 Orta |

### ❌ Henüz Tanımlanmamış Gereksinimler (12/28)

| # | IPM Maddesi | Modül Adı | Açıklama |
|---|-------------|-----------|----------|
| 1 | 4.3 | Acil Durum Bilgileri | Acil durum iletişim ve prosedürler |
| 2 | 4.4 | Firma İletişim Bilgileri | Şirket bilgileri ve iletişim |
| 3 | 4.6 | Sağlık Bakanlığı Uygulama İzin Belgesi | Belge yönetimi ve görüntüleme |
| 4 | 4.7 | Mesul Müdürlük Belgesi | Belge yönetimi |
| 5 | 4.8 | Mesul Müdür Sertifikası | Belge yönetimi |
| 6 | 4.9 | Mesul Müdür Hizmet Sözleşmesi | Belge yönetimi |
| 7 | 4.10 | TSE-8358 Hizmet Yeterlilik Belgesi | Belge yönetimi |
| 8 | 4.11 | ISO 9001:2008 Kalite Belgesi | Belge yönetimi |
| 9 | 4.12 | Mali Mesuliyet Sigortası | Belge yönetimi |
| 10 | 4.16 | Sağlık Bakanlığı Uygulama Formları | Form yönetimi |
| 11 | 4.24 | Onaylı Pestisit Listesi | Ürün listesi ve yönetimi |
| 12 | 4.25-4.26 | Pestisit Kullanım ve MSDS | Pestisit dokümantasyonu |

---

## 🎯 3 Aşamalı Uygulama Stratejisi

### 🔴 FAZ 1: TEMEL IPM DOKÜMANTASYONU (1-2 Hafta)

#### Hedef
Müşterilere sunulması zorunlu temel dokümantasyonu tamamlamak.

#### Görevler

1. **IPM Dokümantasyon Sistemi Altyapısı**
   - [ ] Database schema oluştur (`ipm_documents` tablosu)
   - [ ] Doküman kategorileri tanımla
   - [ ] Müşteri-doküman ilişkilendirme
   - [ ] Versiyon kontrolü

2. **Statik Belge Yönetim Modülü**
   ```
   Kapsam: 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12
   - Firma belgelerini yükleme
   - Müşteri bazlı görüntüleme
   - Geçerlilik tarihi takibi
   - Otomatik bildirimler
   ```

3. **IPM Sözleşme Modülü** (4.1)
   ```
   - Dinamik sözleşme şablonu
   - Müşteri özel hükümler
   - E-imza entegrasyonu (opsiyonel)
   - PDF export
   ```

4. **IPM Program Modülü** (4.2)
   ```
   - Yazılı IPM programı oluşturma
   - Müşteri özel program
   - Hedef belirleme
   - Yöntem tanımlama
   ```

5. **Acil Durum Bilgileri Modülü** (4.3)
   ```
   - Acil durum iletişim listesi
   - Prosedür dokümanları
   - 7/24 iletişim bilgileri
   - İlk yardım bilgileri
   ```

6. **Firma İletişim Kartı** (4.4)
   ```
   - Firma detay bilgileri
   - İletişim kişileri
   - Servis ekibi bilgileri
   - PDF/Kart formatı
   ```

7. **Yıllık Ziyaret Programı** (4.5)
   ```
   - Otomatik takvim oluşturma
   - Mevsimsel planlama
   - Excel/PDF export
   - Müşteri onay sistemi
   ```

#### Veritabanı Şeması

```sql
-- IPM Doküman Kategorileri
CREATE TABLE ipm_document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- '4.1', '4.2', etc.
  name TEXT NOT NULL,
  description TEXT,
  is_static BOOLEAN DEFAULT false, -- Statik belge mi yoksa dinamik rapor mu?
  required BOOLEAN DEFAULT true,
  display_order INTEGER
);

-- IPM Dokümanları
CREATE TABLE ipm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES ipm_document_categories(id),
  customer_id UUID REFERENCES customers(id),
  branch_id UUID REFERENCES branches(id),
  title TEXT NOT NULL,
  file_url TEXT,
  content JSONB, -- Dinamik raporlar için
  version INTEGER DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  status TEXT DEFAULT 'active', -- active, expired, draft
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Müşteri Doküman Erişimi
CREATE TABLE customer_document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  document_id UUID REFERENCES ipm_documents(id),
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT true,
  access_granted_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 🟡 FAZ 2: OPERASYONEL RAPORLAR VE ANALIZLER (2-3 Hafta)

#### Hedef
Ziyaret sonrası raporlama, trend analizi ve takip sistemlerini tamamlamak.

#### Görevler

1. **Ekipman Yerleşim Planı/Kroki Modülü** (4.14)
   ```
   - İnteraktif harita çizimi
   - Ekipman nokta işaretleme
   - Otomatik numaralandırma
   - Ekipman tipi gösterimi
   - PNG/PDF export
   ```

2. **Servis Raporu Modülü** (4.15) - MEVCUT YAPIYA ENTEGRE
   ```
   - Visit report'u IPM formatına uyarla
   - Gözlem kayıtları
   - Uygulama detayları
   - Fotoğraf ekleme
   - Öneri bölümü
   ```

3. **Sağlık Bakanlığı Form Sistemi** (4.16)
   ```
   - Form şablonları
   - Dinamik dolum
   - İmza toplama
   - PDF export
   ```

4. **Aylık/Sezonluk Değerlendirme Raporu** (4.17)
   ```
   - Otomatik rapor üretimi
   - Aktivite özeti
   - Kullanılan ürünler
   - Tespit edilen problemler
   - Öneriler ve aksiyonlar
   ```

5. **Trend Analizi Altyapısı** (4.18-4.22)
   ```
   Aparatlar:
   - Yem İstasyonları
   - Canlı Kapanlar
   - ILT (Insect Light Trap)
   - Böcek İzleme
   - Feromonlu Tuzaklar

   Özellikler:
   - Aktivite kayıtları
   - Grafik gösterimi
   - Isı haritaları
   - Excel/PDF export
   - Alarm sistemi
   ```

6. **Geçici Yerleşim Planı Modülü** (4.23)
   ```
   - Özel durum aparatları
   - Geçici yerleşim haritası
   - Süre takibi
   - Sonuç değerlendirmesi
   ```

#### Veritabanı Genişletmeleri

```sql
-- Ekipman Yerleşim Planları
CREATE TABLE equipment_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  floor_plan_image TEXT,
  layout_data JSONB, -- SVG/Canvas verileri
  is_temporary BOOLEAN DEFAULT false,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aparatlar
CREATE TABLE monitoring_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID REFERENCES equipment_layouts(id),
  device_type TEXT NOT NULL, -- 'bait_station', 'live_trap', 'ilt', 'insect_monitor', 'pheromone_trap'
  device_number TEXT NOT NULL,
  location_name TEXT,
  position_x NUMERIC,
  position_y NUMERIC,
  status TEXT DEFAULT 'active',
  installation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aparat Aktiviteleri
CREATE TABLE device_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES monitoring_devices(id),
  visit_id UUID REFERENCES visits(id),
  activity_type TEXT, -- 'catch', 'consumption', 'inspection'
  quantity INTEGER,
  pest_type TEXT,
  notes TEXT,
  photo_url TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trend Analizleri
CREATE TABLE trend_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  branch_id UUID REFERENCES branches(id),
  analysis_type TEXT, -- 'monthly', 'quarterly', 'annual'
  period_start DATE,
  period_end DATE,
  data JSONB, -- Grafik ve analiz verileri
  report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 🟢 FAZ 3: GELİŞMİŞ ÖZELLİKLER VE OTOMASYON (2-3 Hafta)

#### Hedef
Pestisit yönetimi, eğitim sistemi ve otomasyonları tamamlamak.

#### Görevler

1. **Onaylı Pestisit Listesi Modülü** (4.24)
   ```
   - Müşteri özel pestisit listesi
   - Onay durumu takibi
   - Kullanım kısıtlamaları
   - MSDS entegrasyonu
   ```

2. **Pestisit Kullanım Kartı** (4.25)
   ```
   - Ürün bazlı kullanım kartı
   - Güvenlik talimatları
   - Uygulama dozu
   - İlk yardım bilgileri
   - QR kod entegrasyonu
   ```

3. **MSDS ve Etiket Yönetimi** (4.26)
   ```
   - MSDS doküman arşivi
   - Etiket gösterimi
   - Arama ve filtreleme
   - Versiyonlama
   - Otomatik güncelleme
   ```

4. **Teknisyen Sertifika Yönetimi** (4.27)
   ```
   - Operatör sertifikaları
   - Eğitim belgeleri
   - Geçerlilik takibi
   - Otomatik hatırlatma
   ```

5. **Müşteri Eğitim Sistemi** (4.28)
   ```
   - Eğitim modülleri
   - Sunum oluşturma
   - Katılımcı takibi
   - Sertifika basımı
   - Eğitim kayıtları
   ```

6. **Otomatik Bildirim Sistemi**
   ```
   - Doküman son kullanma tarihi
   - Ziyaret hatırlatmaları
   - Trend anomalileri
   - Sertifika yenileme
   - Email/SMS entegrasyonu
   ```

#### Veritabanı Genişletmeleri

```sql
-- Onaylı Pestisit Listesi
CREATE TABLE approved_pesticides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES biocidal_products(id),
  approval_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  restrictions TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MSDS Dokümanları
CREATE TABLE product_msds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES biocidal_products(id),
  msds_file_url TEXT NOT NULL,
  label_file_url TEXT,
  version TEXT,
  language TEXT DEFAULT 'tr',
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eğitim Kayıtları
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  duration INTEGER, -- dakika
  trainer TEXT,
  presentation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eğitim Katılımcıları
CREATE TABLE training_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id),
  customer_id UUID REFERENCES customers(id),
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  participant_phone TEXT,
  attendance BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bildirimler
CREATE TABLE ipm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  notification_type TEXT NOT NULL, -- 'document_expiry', 'visit_reminder', 'trend_alert', etc.
  title TEXT NOT NULL,
  message TEXT,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, sent, read
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 Müşteri/Şube Görüntüleme Sayfaları Tasarımı

### Sayfa Yapısı

```
/customer/ipm-documents
├── Kategori Seçimi (4.1, 4.2, 4.3, ...)
├── Doküman Listesi
├── Doküman Görüntüleyici (PDF/Image viewer)
└── İndirme Butonları

/branch/ipm-documents
└── (Aynı yapı, branch ID ile filtrelenmiş)
```

### Özellikler

1. **Kategoriye Göre Filtreleme**
   - Sol menüde IPM madde numaraları
   - Aktif/pasif doküman gösterimi
   - Eksik doküman uyarısı

2. **Doküman Görüntüleyici**
   - PDF inline görüntüleme
   - Resim önizleme
   - Dinamik raporları render etme
   - Tam ekran modu

3. **İndirme Seçenekleri**
   - Tekli indirme
   - Toplu ZIP indirme
   - Seçili indirme

4. **Bildirimler**
   - Yeni doküman bildirimi
   - Güncel olmayan doküman uyarısı
   - Son tarih bildirimleri

5. **Arama ve Filtreleme**
   - Doküman adı arama
   - Tarih aralığı filtresi
   - Kategori filtresi
   - Durum filtresi (aktif/expired)

---

## 📱 UI/UX Tasarım Prensipleri

### Müşteri Portalı

```
┌─────────────────────────────────────────────────────────────┐
│ IPM Dokümantasyon Merkezi                           [Logout] │
├─────────────────────────────────────────────────────────────┤
│ Kategoriler          │ Dokümanlar                   [Arama]  │
│ ├─ 4.1 Sözleşme     │ ┌──────────────────────────┐          │
│ ├─ 4.2 IPM Program  │ │ IPM Sözleşmesi 2024      │  [İndir] │
│ ├─ 4.3 Acil Durum   │ │ Geçerlilik: 01/01/2025   │          │
│ ├─ 4.5 Ziyaret      │ └──────────────────────────┘          │
│ │   Takvimi         │                                        │
│ ├─ 4.13 Risk        │ ┌──────────────────────────┐          │
│ │   Analizi         │ │ Yıllık Ziyaret Programı  │  [İndir] │
│ ├─ 4.15 Servis      │ │ 2024 Yılı                │          │
│ │   Raporları       │ └──────────────────────────┘          │
│ ├─ 4.17 Aylık       │                                        │
│ │   Raporlar        │ ⚠️  Eksik Dokümanlar:                 │
│ ├─ 4.18-4.22 Trend  │ • 4.12 Mali Mesuliyet Sigortası       │
│ │   Analizleri      │ • 4.16 Sağlık Bakanlığı Formları      │
│ └─ 4.24-4.26        │                                        │
│    Pestisitler      │                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Uygulama Önceliklendirmesi

### Sprint 1 (1 Hafta) - TEMEL ALTYAPI
- [ ] IPM veritabanı şeması
- [ ] Müşteri doküman görüntüleme sayfası
- [ ] Statik belge yükleme sistemi
- [ ] Doküman kategorileri

### Sprint 2 (1 Hafta) - SÖZLEŞME VE PROGRAM
- [ ] IPM Sözleşme modülü (4.1)
- [ ] IPM Program modülü (4.2)
- [ ] Acil durum bilgileri (4.3)
- [ ] Firma iletişim kartı (4.4)

### Sprint 3 (1 Hafta) - PLANLAMA VE BELGELER
- [ ] Yıllık ziyaret programı (4.5)
- [ ] Belge yönetim sistemi (4.6-4.12)
- [ ] Geçerlilik takibi
- [ ] Otomatik bildirimler

### Sprint 4 (1 Hafta) - RİSK VE EKIPMAN
- [ ] Risk analizi entegrasyonu (4.13)
- [ ] Ekipman kroki modülü (4.14)
- [ ] Yerleşim planı çizimi
- [ ] Aparat yönetimi

### Sprint 5 (1 Hafta) - SERVİS RAPORLARI
- [ ] Servis raporu formatı (4.15)
- [ ] Sağlık Bakanlığı formları (4.16)
- [ ] Aylık değerlendirme (4.17)
- [ ] Rapor şablonları

### Sprint 6 (1 Hafta) - TREND ANALİZİ
- [ ] Aparat aktivite takibi (4.18-4.22)
- [ ] Trend grafikler
- [ ] Isı haritaları
- [ ] Alarm sistemi

### Sprint 7 (1 Hafta) - PESTİSİT YÖNETİMİ
- [ ] Onaylı pestisit listesi (4.24)
- [ ] Kullanım kartı (4.25)
- [ ] MSDS yönetimi (4.26)
- [ ] Pestisit dokümantasyonu

### Sprint 8 (1 Hafta) - EĞİTİM SİSTEMİ
- [ ] Sertifika yönetimi (4.27)
- [ ] Müşteri eğitimleri (4.28)
- [ ] Sertifika basımı
- [ ] Eğitim kayıtları

---

## 📈 Başarı Metrikleri

### Teknik Metrikler
- ✅ 28/28 IPM gereksinimi tamamlandı
- ✅ Tüm dokümanlar otomatik oluşturuluyor
- ✅ Müşteriler kendi dokümanlarına erişebiliyor
- ✅ Trend analizleri otomatik hesaplanıyor
- ✅ Bildirimler zamanında gönderiliyor

### İş Metrikleri
- 📊 Müşteri memnuniyeti artışı
- 📊 Doküman hazırlama süresinde %80 azalma
- 📊 Compliance (uygunluk) oranı %100
- 📊 Operasyonel verimlilik artışı
- 📊 Raporlama hatasında %90 azalma

---

## 🎯 Sonuç

Bu yol haritası ile İlaçlamatik sistemi:
- ✅ Tam IPM uyumlu hizmet sunabilecek
- ✅ Müşterilere profesyonel dokümantasyon sağlayabilecek
- ✅ Yasal gereksinimleri karşılayabilecek
- ✅ Rekabet avantajı elde edebilecek
- ✅ Operasyonel verimliliği maksimize edebilecek

**Tahmini Toplam Süre:** 8-10 hafta
**Tahmini Geliştirici Zamanı:** 320-400 saat
**Öncelik Sırası:** Faz 1 → Faz 2 → Faz 3

---

## 📞 Sonraki Adımlar

1. **Onay Al**: Bu yol haritasını gözden geçir ve onayla
2. **Sprint Başlat**: Sprint 1'i başlat
3. **Veritabanı Kur**: İlk migration'ları uygula
4. **UI Tasarla**: Müşteri portalı tasarımını tamamla
5. **Geliştir**: Sprint planına göre ilerle

**Hazırlayan:** İlaçlamatik AI Assistant
**Tarih:** 20 Kasım 2024
**Versiyon:** 1.0
