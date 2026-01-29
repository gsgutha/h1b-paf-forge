-- Create table for authorized signatories
CREATE TABLE public.authorized_signatories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  signature_image_path TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authorized_signatories ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no auth required for this internal tool)
CREATE POLICY "Allow public read access to signatories"
ON public.authorized_signatories
FOR SELECT
USING (true);

-- Allow public insert/update/delete for signatories
CREATE POLICY "Allow public write access to signatories"
ON public.authorized_signatories
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_authorized_signatories_updated_at
BEFORE UPDATE ON public.authorized_signatories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for signature images
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true);

-- Allow public read access to signature images
CREATE POLICY "Signature images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');

-- Allow public upload of signature images
CREATE POLICY "Allow public upload of signatures"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'signatures');

-- Allow public update of signature images
CREATE POLICY "Allow public update of signatures"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'signatures');

-- Allow public delete of signature images
CREATE POLICY "Allow public delete of signatures"
ON storage.objects
FOR DELETE
USING (bucket_id = 'signatures');

-- Insert default signatories
INSERT INTO public.authorized_signatories (name, title, is_default)
VALUES 
  ('Sreedevi Nair', 'Director of Operations', true),
  ('Venkat Kalyan Chivukula', 'Chief Executive Officer', false);