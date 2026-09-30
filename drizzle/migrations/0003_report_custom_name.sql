ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS custom_name text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS report_type text;