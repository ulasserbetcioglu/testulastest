/*
  # Add email logs table
  
  1. New Tables
    - `email_logs`: Track email sending history
    
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  record_id uuid NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL,
  error_message text,
  sent_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for admin"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'admin@ilaclamatik.com');

CREATE POLICY "Enable insert access for authenticated users"
  ON email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);