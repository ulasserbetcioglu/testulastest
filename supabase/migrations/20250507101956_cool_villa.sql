/*
  # Add equipment definitions with properties

  1. Changes
    - Insert equipment records with properties
    - Each equipment has specific properties based on type
    - Properties include boolean, number and string fields
    - Properties are stored as JSONB
    
  2. Security
    - Maintain existing RLS policies
*/

-- Insert equipment definitions with properties
INSERT INTO equipment (name, code, type, properties, is_active, order_no) VALUES
  (
    'Yem İstasyonu',
    'YEM_ISTASYONU',
    'KEMIRGEN',
    '{
      "kemirgenAktivitesi": {"type": "boolean", "label": "Kemirgen Aktivitesi"},
      "kemirgenSayisi": {"type": "number", "label": "Kemirgen Sayısı"},
      "yemTuketimi": {"type": "boolean", "label": "Yem Tüketimi"},
      "kemirgenTuru": {"type": "string", "label": "Kemirgen Türü"}
    }',
    true,
    10
  ),
  (
    'Fare - Sıçan Kapanı',
    'FARE_KAPANI',
    'KEMIRGEN',
    '{
      "kemirgenAktivitesi": {"type": "boolean", "label": "Kemirgen Aktivitesi"},
      "kemirgenSayisi": {"type": "number", "label": "Kemirgen Sayısı"},
      "yakalamaOrani": {"type": "number", "label": "Yakalama Oranı (%)"},
      "kemirgenTuru": {"type": "string", "label": "Kemirgen Türü"}
    }',
    true,
    20
  ),
  (
    'Haşere Monitörü',
    'HASERE_MONITOR',
    'YURUYEN',
    '{
      "hamamBocegiSayisi": {"type": "number", "label": "Hamam Böceği Sayısı"},
      "karincaSayisi": {"type": "number", "label": "Karınca Sayısı"},
      "gumuskurtSayisi": {"type": "number", "label": "Gümüşkurt Sayısı"},
      "akarSayisi": {"type": "number", "label": "Akar Sayısı"},
      "digerSayisi": {"type": "number", "label": "Diğer Sayısı"},
      "aktiviteNotu": {"type": "string", "label": "Aktivite Notu"}
    }',
    true,
    30
  ),
  (
    'Sinek Kontrol Birimi',
    'SINEK_KONTROL',
    'UCAN',
    '{
      "karasinekSayisi": {"type": "number", "label": "Karasinek Sayısı"},
      "sivrisinekSayisi": {"type": "number", "label": "Sivrisinek Sayısı"},
      "meyvesinegiSayisi": {"type": "number", "label": "Meyve Sineği Sayısı"},
      "ariSayisi": {"type": "number", "label": "Arı Sayısı"},
      "ambarZararlisiSayisi": {"type": "number", "label": "Ambar Zararlısı Sayısı"},
      "digerSayisi": {"type": "number", "label": "Diğer Sayısı"},
      "lambaCalismaDurumu": {"type": "boolean", "label": "Lamba Çalışma Durumu"}
    }',
    true,
    40
  ),
  (
    'Kıyı Kapanı',
    'KIYI_KAPANI',
    'KEMIRGEN',
    '{
      "kemirgenAktivitesi": {"type": "boolean", "label": "Kemirgen Aktivitesi"},
      "kemirgenSayisi": {"type": "number", "label": "Kemirgen Sayısı"},
      "kemirgenTuru": {"type": "string", "label": "Kemirgen Türü"},
      "konumNotu": {"type": "string", "label": "Konum Notu"}
    }',
    true,
    50
  ),
  (
    'Kedi - Köpek Kapanı',
    'KEDI_KOPEK_KAPANI',
    'DIGER',
    '{
      "kediKopekAktivitesi": {"type": "boolean", "label": "Kedi/Köpek Aktivitesi"},
      "kediKopekSayisi": {"type": "number", "label": "Kedi/Köpek Sayısı"},
      "hayvanTuru": {"type": "string", "label": "Hayvan Türü"}
    }',
    true,
    60
  ),
  (
    'Kuş Kapanı',
    'KUS_KAPANI',
    'DIGER',
    '{
      "kusAktivitesi": {"type": "boolean", "label": "Kuş Aktivitesi"},
      "kusSayisi": {"type": "number", "label": "Kuş Sayısı"},
      "kusTuru": {"type": "string", "label": "Kuş Türü"}
    }',
    true,
    70
  ),
  (
    'Ambar Zararlı Tuzağı',
    'AMBAR_TUZAGI',
    'AMBAR',
    '{
      "ambarZararlisiAktivitesi": {"type": "boolean", "label": "Ambar Zararlısı Aktivitesi"},
      "ambarZararlisiSayisi": {"type": "number", "label": "Ambar Zararlısı Sayısı"},
      "zararlininTuru": {"type": "string", "label": "Zararlının Türü"}
    }',
    true,
    80
  ),
  (
    'Güve Tuzağı',
    'GUVE_TUZAGI',
    'AMBAR',
    '{
      "guveSayisi": {"type": "number", "label": "Güve Sayısı"},
      "bitSayisi": {"type": "number", "label": "Bit Sayısı"},
      "digerSayisi": {"type": "number", "label": "Diğer Sayısı"},
      "guveTuru": {"type": "string", "label": "Güve Türü"}
    }',
    true,
    90
  ),
  (
    'Feromon Tuzağı',
    'FEROMON_TUZAGI',
    'AMBAR',
    '{
      "hedefTur": {"type": "string", "label": "Hedef Tür"},
      "yakalamaOrani": {"type": "number", "label": "Yakalama Oranı (%)"},
      "yakalananSayi": {"type": "number", "label": "Yakalanan Sayısı"},
      "feromonDegisimTarihi": {"type": "string", "label": "Feromon Değişim Tarihi"}
    }',
    true,
    100
  ),
  (
    'UV Işık Tuzağı',
    'UV_TUZAK',
    'UCAN',
    '{
      "yakalananSayi": {"type": "number", "label": "Yakalanan Sayısı"},
      "lambaCalismaDurumu": {"type": "boolean", "label": "Lamba Çalışma Durumu"},
      "lambaDegisimTarihi": {"type": "string", "label": "Lamba Değişim Tarihi"},
      "yapiskanliFolyoDurumu": {"type": "string", "label": "Yapışkanlı Folyo Durumu"}
    }',
    true,
    110
  ),
  (
    'Elektronik Kovucu',
    'ELEKTRONIK_KOVUCU',
    'DIGER',
    '{
      "calismaDurumu": {"type": "boolean", "label": "Çalışma Durumu"},
      "pilDurumu": {"type": "string", "label": "Pil Durumu"},
      "etkililikOrani": {"type": "number", "label": "Etkililik Oranı (%)"}
    }',
    true,
    120
  ),
  (
    'Özel Ekipman',
    'OZEL_EKIPMAN',
    'DIGER',
    '{}',
    true,
    999
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  properties = EXCLUDED.properties,
  is_active = EXCLUDED.is_active,
  order_no = EXCLUDED.order_no;