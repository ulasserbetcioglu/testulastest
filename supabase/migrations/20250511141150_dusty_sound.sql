/*
  # Add notification system
  
  1. New Tables
    - `notifications`: Store notifications for users
    
  2. Security
    - Enable RLS
    - Add policies for users to access their own notifications
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Admin can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Admin can delete notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_entity_type_idx ON notifications(entity_type);
CREATE INDEX IF NOT EXISTS notifications_entity_id_idx ON notifications(entity_id);

-- Create function to send notification to a user
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    link,
    type,
    entity_type,
    entity_id,
    created_by
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_link,
    p_type,
    p_entity_type,
    p_entity_id,
    auth.uid()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send notification to all users with a specific role
CREATE OR REPLACE FUNCTION send_notification_to_role(
  p_role text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_user record;
BEGIN
  FOR v_user IN 
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = p_role
  LOOP
    PERFORM send_notification(
      v_user.id,
      p_title,
      p_message,
      p_link,
      p_type,
      p_entity_type,
      p_entity_id
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send notification to all users
CREATE OR REPLACE FUNCTION send_notification_to_all(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_type text DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_user record;
BEGIN
  FOR v_user IN 
    SELECT id FROM auth.users
  LOOP
    PERFORM send_notification(
      v_user.id,
      p_title,
      p_message,
      p_link,
      p_type,
      p_entity_type,
      p_entity_id
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to send notification when a visit is created
CREATE OR REPLACE FUNCTION notify_on_visit_create()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_branch_name text;
  v_customer_auth_id uuid;
  v_branch_auth_id uuid;
  v_visit_date text;
BEGIN
  -- Get customer and branch names
  SELECT c.kisa_isim, c.auth_id
  INTO v_customer_name, v_customer_auth_id
  FROM customers c
  WHERE c.id = NEW.customer_id;
  
  SELECT b.sube_adi, b.auth_id
  INTO v_branch_name, v_branch_auth_id
  FROM branches b
  WHERE b.id = NEW.branch_id;
  
  -- Format visit date
  v_visit_date := to_char(NEW.visit_date, 'DD.MM.YYYY HH24:MI');
  
  -- Send notification to customer
  IF v_customer_auth_id IS NOT NULL THEN
    PERFORM send_notification(
      v_customer_auth_id,
      'Yeni Ziyaret Planlandı',
      'Şirketiniz için ' || v_visit_date || ' tarihinde bir ziyaret planlandı.',
      '/customer/ziyaretler',
      'visit',
      'visit',
      NEW.id
    );
  END IF;
  
  -- Send notification to branch
  IF v_branch_auth_id IS NOT NULL THEN
    PERFORM send_notification(
      v_branch_auth_id,
      'Yeni Ziyaret Planlandı',
      'Şubeniz için ' || v_visit_date || ' tarihinde bir ziyaret planlandı.',
      '/branch/takvim',
      'visit',
      'visit',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for visit creation
DROP TRIGGER IF EXISTS notify_visit_create_trigger ON visits;
CREATE TRIGGER notify_visit_create_trigger
  AFTER INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_visit_create();

-- Create trigger function to send notification when a corrective action is created
CREATE OR REPLACE FUNCTION notify_on_corrective_action_create()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name text;
  v_branch_name text;
  v_customer_auth_id uuid;
  v_branch_auth_id uuid;
  v_due_date text;
BEGIN
  -- Get customer and branch names
  SELECT c.kisa_isim, c.auth_id
  INTO v_customer_name, v_customer_auth_id
  FROM customers c
  WHERE c.id = NEW.customer_id;
  
  SELECT b.sube_adi, b.auth_id
  INTO v_branch_name, v_branch_auth_id
  FROM branches b
  WHERE b.id = NEW.branch_id;
  
  -- Format due date
  v_due_date := to_char(NEW.due_date, 'DD.MM.YYYY');
  
  -- Send notification to customer
  IF v_customer_auth_id IS NOT NULL THEN
    PERFORM send_notification(
      v_customer_auth_id,
      'Yeni Düzeltici Önleyici Faaliyet',
      'Şirketiniz için yeni bir DÖF kaydedildi. Termin tarihi: ' || v_due_date,
      '/customer/dof',
      'dof',
      'corrective_action',
      NEW.id
    );
  END IF;
  
  -- Send notification to branch
  IF v_branch_auth_id IS NOT NULL THEN
    PERFORM send_notification(
      v_branch_auth_id,
      'Yeni Düzeltici Önleyici Faaliyet',
      'Şubeniz için yeni bir DÖF kaydedildi. Termin tarihi: ' || v_due_date,
      '/branch/dof',
      'dof',
      'corrective_action',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for corrective action creation
DROP TRIGGER IF EXISTS notify_corrective_action_create_trigger ON corrective_actions;
CREATE TRIGGER notify_corrective_action_create_trigger
  AFTER INSERT ON corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_corrective_action_create();

-- Create trigger function to send notification when a document is uploaded
CREATE OR REPLACE FUNCTION notify_on_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_name text;
  v_entity_auth_id uuid;
  v_document_type text;
BEGIN
  -- Get document type text
  CASE NEW.document_type
    WHEN 'quality' THEN v_document_type := 'Kalite Dökümanı';
    WHEN 'workplace' THEN v_document_type := 'İş Yeri Dökümanı';
    WHEN 'biocidal' THEN v_document_type := 'Biyosidal Ürün Ruhsatı';
    WHEN 'msds' THEN v_document_type := 'MSDS';
    ELSE v_document_type := 'Döküman';
  END CASE;
  
  -- Get entity info and send notification based on entity type
  CASE NEW.entity_type
    WHEN 'customer' THEN
      SELECT c.kisa_isim, c.auth_id
      INTO v_entity_name, v_entity_auth_id
      FROM customers c
      WHERE c.id = NEW.entity_id;
      
      IF v_entity_auth_id IS NOT NULL THEN
        PERFORM send_notification(
          v_entity_auth_id,
          'Yeni Döküman Yüklendi',
          v_document_type || ' yüklendi: ' || NEW.title,
          '/customer/dokumanlar',
          'document',
          'document',
          NEW.id
        );
      END IF;
      
    WHEN 'branch' THEN
      SELECT b.sube_adi, b.auth_id
      INTO v_entity_name, v_entity_auth_id
      FROM branches b
      WHERE b.id = NEW.entity_id;
      
      IF v_entity_auth_id IS NOT NULL THEN
        PERFORM send_notification(
          v_entity_auth_id,
          'Yeni Döküman Yüklendi',
          v_document_type || ' yüklendi: ' || NEW.title,
          '/branch/dokumanlar',
          'document',
          'document',
          NEW.id
        );
      END IF;
      
    WHEN 'operator' THEN
      SELECT o.name, o.auth_id
      INTO v_entity_name, v_entity_auth_id
      FROM operators o
      WHERE o.id = NEW.entity_id;
      
      IF v_entity_auth_id IS NOT NULL THEN
        PERFORM send_notification(
          v_entity_auth_id,
          'Yeni Döküman Yüklendi',
          v_document_type || ' yüklendi: ' || NEW.title,
          '/operator/dokumanlar',
          'document',
          'document',
          NEW.id
        );
      END IF;
      
    ELSE
      -- For general documents, no specific notification
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document upload
DROP TRIGGER IF EXISTS notify_document_upload_trigger ON documents;
CREATE TRIGGER notify_document_upload_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_document_upload();

-- Create function to send daily notifications for upcoming visits
CREATE OR REPLACE FUNCTION send_daily_visit_notifications()
RETURNS void AS $$
DECLARE
  v_visit record;
  v_customer_auth_id uuid;
  v_branch_auth_id uuid;
  v_operator_auth_id uuid;
  v_visit_date text;
BEGIN
  -- Get visits scheduled for tomorrow
  FOR v_visit IN
    SELECT 
      v.id,
      v.visit_date,
      v.customer_id,
      v.branch_id,
      v.operator_id,
      c.kisa_isim as customer_name,
      c.auth_id as customer_auth_id,
      b.sube_adi as branch_name,
      b.auth_id as branch_auth_id,
      o.name as operator_name,
      o.auth_id as operator_auth_id
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN branches b ON v.branch_id = b.id
    LEFT JOIN operators o ON v.operator_id = o.id
    WHERE 
      v.status = 'planned' AND
      v.visit_date::date = (CURRENT_DATE + INTERVAL '1 day')::date
  LOOP
    -- Format visit date
    v_visit_date := to_char(v_visit.visit_date, 'DD.MM.YYYY HH24:MI');
    
    -- Send notification to customer
    IF v_visit.customer_auth_id IS NOT NULL THEN
      PERFORM send_notification(
        v_visit.customer_auth_id,
        'Yarın Ziyaret Var',
        'Yarın (' || v_visit_date || ') şirketiniz için bir ziyaret planlanmıştır.',
        '/customer/ziyaretler',
        'reminder',
        'visit',
        v_visit.id
      );
    END IF;
    
    -- Send notification to branch
    IF v_visit.branch_auth_id IS NOT NULL THEN
      PERFORM send_notification(
        v_visit.branch_auth_id,
        'Yarın Ziyaret Var',
        'Yarın (' || v_visit_date || ') şubeniz için bir ziyaret planlanmıştır.',
        '/branch/takvim',
        'reminder',
        'visit',
        v_visit.id
      );
    END IF;
    
    -- Send notification to operator
    IF v_visit.operator_auth_id IS NOT NULL THEN
      PERFORM send_notification(
        v_visit.operator_auth_id,
        'Yarın Ziyaret Var',
        'Yarın (' || v_visit_date || ') ' || COALESCE(v_visit.customer_name, 'Müşteri') || 
        CASE WHEN v_visit.branch_name IS NOT NULL THEN ' - ' || v_visit.branch_name ELSE '' END ||
        ' için bir ziyaret planladınız.',
        '/operator/ziyaretler',
        'reminder',
        'visit',
        v_visit.id
      );
    END IF;
  END LOOP;
  
  -- Get corrective actions with due date tomorrow
  FOR v_visit IN
    SELECT 
      ca.id,
      ca.due_date,
      ca.customer_id,
      ca.branch_id,
      ca.responsible,
      c.kisa_isim as customer_name,
      c.auth_id as customer_auth_id,
      b.sube_adi as branch_name,
      b.auth_id as branch_auth_id
    FROM corrective_actions ca
    LEFT JOIN customers c ON ca.customer_id = c.id
    LEFT JOIN branches b ON ca.branch_id = b.id
    WHERE 
      ca.status IN ('open', 'in_progress') AND
      ca.due_date = (CURRENT_DATE + INTERVAL '1 day')::date
  LOOP
    -- Format due date
    v_visit_date := to_char(v_visit.due_date, 'DD.MM.YYYY');
    
    -- Send notification to customer
    IF v_visit.customer_auth_id IS NOT NULL THEN
      PERFORM send_notification(
        v_visit.customer_auth_id,
        'DÖF Termin Tarihi Yaklaşıyor',
        'Yarın (' || v_visit_date || ') bir düzeltici önleyici faaliyet için son tarihtir.',
        '/customer/dof',
        'reminder',
        'corrective_action',
        v_visit.id
      );
    END IF;
    
    -- Send notification to branch
    IF v_visit.branch_auth_id IS NOT NULL THEN
      PERFORM send_notification(
        v_visit.branch_auth_id,
        'DÖF Termin Tarihi Yaklaşıyor',
        'Yarın (' || v_visit_date || ') bir düzeltici önleyici faaliyet için son tarihtir.',
        '/branch/dof',
        'reminder',
        'corrective_action',
        v_visit.id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;