-- Create function to check if email exists in auth.users
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  ) INTO email_exists;
  
  RETURN email_exists;
END;
$$;

-- Create function to get user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_to_check TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM auth.users 
  WHERE email = email_to_check
  LIMIT 1;
  
  RETURN user_id;
END;
$$;

-- Create function to check if user has admin email
CREATE OR REPLACE FUNCTION is_admin_email(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN email_to_check = 'admin@ilaclamatik.com';
END;
$$;

-- Create function to delete user by ID (for cleanup)
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- This function will only work if the executing role has proper permissions
  -- It's kept for reference but may not work without superuser privileges
  BEGIN
    DELETE FROM auth.users WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
      -- Silently fail if permissions are insufficient
      NULL;
  END;
END;
$$;