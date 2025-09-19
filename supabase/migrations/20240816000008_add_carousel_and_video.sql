-- Add new columns for video and carousel content to the 'content' table.
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS carousel_slides JSONB;

-- Add a comment to describe the purpose of the new columns.
COMMENT ON COLUMN public.content.video_url IS 'Stores the data URI or URL for a generated video.';
COMMENT ON COLUMN public.content.carousel_slides IS 'Stores an array of JSON objects, each representing a slide in a carousel.';
