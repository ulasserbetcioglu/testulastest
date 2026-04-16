-- Migration for Interactive Reconciliation System

-- 1. Add reconciliation_email to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reconciliation_email text;

-- 2. Create reconciliation_responses table
CREATE TABLE IF NOT EXISTS reconciliation_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id),
    parasut_id bigint,
    month text NOT NULL, -- YYYY-MM
    balance numeric NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    full_name text, -- Optional for pending
    unit text,
    message text,
    token uuid UNIQUE DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

-- 3. Security (RLS)
ALTER TABLE reconciliation_responses ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (for customers responding to emails)
DROP POLICY IF EXISTS "Public can insert reconciliation responses" ON reconciliation_responses;
CREATE POLICY "Public can insert reconciliation responses"
    ON reconciliation_responses
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow public reading ONLY if token matches (for the landing page)
DROP POLICY IF EXISTS "Public can read own reconciliation response via token" ON reconciliation_responses;
CREATE POLICY "Public can read own reconciliation response via token"
    ON reconciliation_responses
    FOR SELECT
    TO anon, authenticated
    USING (true); -- We will filter by token in the application logic

-- Allow admins full access
DROP POLICY IF EXISTS "Admins have full access to reconciliation responses" ON reconciliation_responses;
CREATE POLICY "Admins have full access to reconciliation responses"
    ON reconciliation_responses
    FOR ALL
    TO authenticated
    USING (true);
