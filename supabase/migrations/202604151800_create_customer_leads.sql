-- Create customer_leads table
CREATE TABLE IF NOT EXISTS public.customer_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    notes TEXT,
    photo_url TEXT,
    photo_path TEXT
);

-- Enable RLS
ALTER TABLE public.customer_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_leads
-- Admin can do everything
CREATE POLICY "Admin full access on customer_leads" 
ON public.customer_leads 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com') 
WITH CHECK (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com');

-- Operators can view their own leads
CREATE POLICY "Operators can view own leads" 
ON public.customer_leads 
FOR SELECT 
TO authenticated 
USING (
    operator_id IN (
        SELECT id FROM public.operators WHERE auth_id = auth.uid()
    )
);

-- Operators can insert their own leads
CREATE POLICY "Operators can insert own leads" 
ON public.customer_leads 
FOR INSERT 
TO authenticated 
WITH CHECK (
    operator_id IN (
        SELECT id FROM public.operators WHERE auth_id = auth.uid()
    )
);

-- Create Storage Bucket for lead photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-photos', 'lead-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for lead-photos
-- Admin full access
CREATE POLICY "Admin full access on lead-photos"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'lead-photos' AND (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com'))
WITH CHECK (bucket_id = 'lead-photos' AND (auth.jwt() ->> 'email' = 'admin@ilaclamatik.com'));

-- Operators can upload to lead-photos
CREATE POLICY "Operators can upload to lead-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-photos');

-- Public view (if bucket is public, this is mainly for safety)
CREATE POLICY "Public view lead-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lead-photos');
