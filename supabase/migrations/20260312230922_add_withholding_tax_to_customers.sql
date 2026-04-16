-- Add has_withholding column to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS has_withholding boolean DEFAULT false;

-- Add description for consistency (in case it's needed)
COMMENT ON COLUMN public.customers.has_withholding IS 'Müşterinin tevkifatlı fatura kesilip kesilmeyeceğini belirten flag (9/10)';
