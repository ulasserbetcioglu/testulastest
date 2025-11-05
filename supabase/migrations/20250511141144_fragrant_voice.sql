-- Create company-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'company-assets', 'company-assets', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE name = 'company-assets'
);

-- Create documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'documents', 'documents', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE name = 'documents'
);

-- Create policy to allow all authenticated users to read from buckets
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id IN ('company-assets', 'documents'));

-- Create policy to allow only admin to insert into company-assets bucket
CREATE POLICY "Allow admin insert access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' AND
  auth.email() = 'admin@ilaclamatik.com'
);

-- Create policy to allow only admin to update objects in company-assets bucket
CREATE POLICY "Allow admin update access"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets' AND
  auth.email() = 'admin@ilaclamatik.com'
);

-- Create policy to allow only admin to delete objects from company-assets bucket
CREATE POLICY "Allow admin delete access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets' AND
  auth.email() = 'admin@ilaclamatik.com'
);

-- Create policy to allow authenticated users to insert into documents bucket
CREATE POLICY "Allow documents insert access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
);

-- Create policy to allow only admin to delete from documents bucket
CREATE POLICY "Allow documents delete access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.email() = 'admin@ilaclamatik.com'
);