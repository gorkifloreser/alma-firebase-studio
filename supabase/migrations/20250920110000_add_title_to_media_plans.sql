
ALTER TABLE public.media_plans
ADD COLUMN title TEXT;

-- It's good practice to provide a default for existing rows if any
UPDATE public.media_plans
SET title = 'Media Plan created on ' || to_char(created_at, 'YYYY-MM-DD')
WHERE title IS NULL;

-- Now, make the column not nullable
ALTER TABLE public.media_plans
ALTER COLUMN title SET NOT NULL;