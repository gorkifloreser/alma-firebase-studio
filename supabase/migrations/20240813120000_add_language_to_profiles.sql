
ALTER TABLE public.profiles
ADD COLUMN primary_language TEXT DEFAULT 'en' CHECK (char_length(primary_language) = 2),
ADD COLUMN secondary_language TEXT CHECK (char_length(secondary_language) = 2);

COMMENT ON COLUMN public.profiles.primary_language IS 'User''s primary language choice (ISO 639-1 code).';
COMMENT ON COLUMN public.profiles.secondary_language IS 'User''s optional secondary language choice (ISO 639-1 code).';
