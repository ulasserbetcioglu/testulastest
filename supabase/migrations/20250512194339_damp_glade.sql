/*
  # Add helper functions for user management
  
  1. New Functions
    - `check_email_exists`: Check if an email exists in auth.users
    - `get_user_id_by_email`: Get user ID by email
    
  2. Security
    - Use SECURITY DEFINER to ensure proper access
    - Avoid granting restricted roles
*/

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