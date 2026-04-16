/*
  # Add anon policies for certificates and training presentations

  Operators using local auth need to:
  1. certificates - INSERT (create certificates during training)
  2. training_presentations - SELECT (view presentations), INSERT/UPDATE (manage)

  These were only available to authenticated users.
*/

-- certificates: anon INSERT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert certificates for local auth' AND polrelid = 'public.certificates'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert certificates for local auth"
      ON public.certificates FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- training_presentations: anon SELECT, INSERT, UPDATE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon read training_presentations for local auth' AND polrelid = 'public.training_presentations'::regclass
  ) THEN
    CREATE POLICY "Allow anon read training_presentations for local auth"
      ON public.training_presentations FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon insert training_presentations for local auth' AND polrelid = 'public.training_presentations'::regclass
  ) THEN
    CREATE POLICY "Allow anon insert training_presentations for local auth"
      ON public.training_presentations FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'Allow anon update training_presentations for local auth' AND polrelid = 'public.training_presentations'::regclass
  ) THEN
    CREATE POLICY "Allow anon update training_presentations for local auth"
      ON public.training_presentations FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
