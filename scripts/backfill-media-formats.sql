-- This script updates the `media_plan_items` table to populate the new
-- `media_format` and `aspect_ratio` columns based on the legacy `format` column.
-- Run this script in your Supabase SQL Editor.

UPDATE public.media_plan_items
SET
  -- 1. Set the media_format based on keywords in the old `format` string.
  media_format = (
    CASE
      WHEN lower(format) LIKE '%image%' THEN 'Image'
      WHEN lower(format) LIKE '%video%' THEN 'Video'
      WHEN lower(format) LIKE '%reel%' THEN 'Reel'
      WHEN lower(format) LIKE '%story%' THEN 'Story'
      WHEN lower(format) LIKE '%carousel%' THEN 'Carousel'
      WHEN lower(format) LIKE '%text%' THEN 'Text'
      WHEN lower(format) LIKE '%email%' THEN 'Email'
      WHEN lower(format) LIKE '%newsletter%' THEN 'Email'
      WHEN lower(format) LIKE '%blog%' THEN 'Blog'
      WHEN lower(format) LIKE '%landing page%' THEN 'Landing Page'
      ELSE 'Unknown'
    END
  ),
  -- 2. Extract the aspect ratio (e.g., '9:16') from the `format` string.
  -- It looks for a pattern of numbers separated by a colon.
  aspect_ratio = (
    (regexp_matches(format, '\d+:\d+'))[1]
  )
-- 3. Only update rows where this migration is needed.
WHERE
  format IS NOT NULL
  AND (media_format IS NULL OR aspect_ratio IS NULL);

-- Verification Step (Optional):
-- After running the update, you can run this query to see if any rows were missed.
-- It should return 0 rows.
/*
SELECT id, format, media_format, aspect_ratio
FROM public.media_plan_items
WHERE format IS NOT NULL AND (media_format IS NULL OR aspect_ratio IS NULL);
*/
