-- Update visits table policies
DROP POLICY IF EXISTS "Enable customer access to own visits" ON visits;
CREATE POLICY "Enable customer access to own visits"
  ON visits
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own visits
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = visits.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see visits for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = visits.branch_id
      AND branches.auth_id = auth.uid()
    )
  );

-- Update corrective_actions table policies
DROP POLICY IF EXISTS "Enable customer access to own corrective actions" ON corrective_actions;
CREATE POLICY "Enable customer access to own corrective actions"
  ON corrective_actions
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own corrective actions
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = corrective_actions.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see corrective actions for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = corrective_actions.branch_id
      AND branches.auth_id = auth.uid()
    )
  );

-- Update certificates table policies
DROP POLICY IF EXISTS "Enable customer access to own certificates" ON certificates;
CREATE POLICY "Enable customer access to own certificates"
  ON certificates
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see their own certificates
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = certificates.customer_id
      AND customers.auth_id = auth.uid()
    )
    -- Branch can see certificates for their branch
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = certificates.branch_id
      AND branches.auth_id = auth.uid()
    )
  );

-- Update documents table policies
DROP POLICY IF EXISTS "Enable customer access to own documents" ON documents;
CREATE POLICY "Enable customer access to own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    -- Customer can see documents where entity_type is 'customer' and entity_id matches their id
    (entity_type = 'customer' AND EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = documents.entity_id
      AND customers.auth_id = auth.uid()
    ))
    -- Branch can see documents where entity_type is 'branch' and entity_id matches their id
    OR (entity_type = 'branch' AND EXISTS (
      SELECT 1 FROM branches
      WHERE branches.id = documents.entity_id
      AND branches.auth_id = auth.uid()
    ))
    -- Everyone can see general documents
    OR entity_type = 'general'
  );

-- Update notifications table policies to ensure customers and branches see their notifications
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR auth.email() = 'admin@ilaclamatik.com'
    -- Customer can see notifications for their customer entity
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.auth_id = auth.uid()
      AND notifications.entity_type = 'customer'
      AND notifications.entity_id = customers.id
    )
    -- Branch can see notifications for their branch entity
    OR EXISTS (
      SELECT 1 FROM branches
      WHERE branches.auth_id = auth.uid()
      AND notifications.entity_type = 'branch'
      AND notifications.entity_id = branches.id
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Set user role in auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"user"'::jsonb
  )
  WHERE id = NEW.id AND (raw_user_meta_data->>'role') IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create profiles table to store user information if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'user',
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid())';
  END IF;
END $$;

-- Create function to insert operator record when a new user with operator role is created
CREATE OR REPLACE FUNCTION insert_operator()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'operator' THEN
    INSERT INTO operators (name, email, status, auth_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'Açık',
      NEW.id
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inserting operator
DROP TRIGGER IF EXISTS on_auth_user_created_insert_operator ON auth.users;
CREATE TRIGGER on_auth_user_created_insert_operator
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION insert_operator();