-- Add new fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS available_time TEXT DEFAULT 'SAT - FRI, 10AM - 11PM',
ADD COLUMN IF NOT EXISTS social_media_text TEXT DEFAULT 'Follow us on social media for updates and offers.',
ADD COLUMN IF NOT EXISTS copyright_text TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS show_powered_by BOOLEAN DEFAULT true;

