/*
  # Add operator local auth support

  1. Changes
    - Add public insert policy on operators table for admin creating operators via local auth
    - Add public update policy for operator password changes
    - These match the existing patterns used for customers and branches

  2. Security
    - Public read already exists for authentication lookups
    - Insert and update policies allow the admin (authenticated via Supabase auth) to manage operators
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert for local auth operators' AND polrelid = 'public.operators'::regclass
  ) THEN
    CREATE POLICY "Allow public insert for local auth operators"
      ON public.operators
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow public update for local auth operators' AND polrelid = 'public.operators'::regclass
  ) THEN
    CREATE POLICY "Allow public update for local auth operators"
      ON public.operators
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
