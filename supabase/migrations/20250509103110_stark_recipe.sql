-- First check and insert all operators
DO $$ 
BEGIN
  -- Add Samet Şen
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'samet.sen2@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Samet Şen', 'samet.sen2@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Ahmet Yılmaz
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'ahmet.yilmaz@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Ahmet Yılmaz', 'ahmet.yilmaz@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Mehmet Demir
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'mehmet.demir@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Mehmet Demir', 'mehmet.demir@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Ali Kaya
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'ali.kaya@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Ali Kaya', 'ali.kaya@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Mustafa Özdemir
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'mustafa.ozdemir@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Mustafa Özdemir', 'mustafa.ozdemir@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Ayşe Yıldız
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'ayse.yildiz@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Ayşe Yıldız', 'ayse.yildiz@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Fatma Çelik
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'fatma.celik@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Fatma Çelik', 'fatma.celik@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Zeynep Şahin
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'zeynep.sahin@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Zeynep Şahin', 'zeynep.sahin@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add Hasan Arslan
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'hasan.arslan@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('Hasan Arslan', 'hasan.arslan@pestmentor.com.tr', 'Açık');
  END IF;

  -- Add İbrahim Koç
  IF NOT EXISTS (
    SELECT 1 FROM operators WHERE email = 'ibrahim.koc@pestmentor.com.tr'
  ) THEN
    INSERT INTO operators (name, email, status)
    VALUES ('İbrahim Koç', 'ibrahim.koc@pestmentor.com.tr', 'Açık');
  END IF;
END $$;