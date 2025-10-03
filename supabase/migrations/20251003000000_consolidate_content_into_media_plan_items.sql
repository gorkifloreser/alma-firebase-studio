
-- Step 1: Create a new ENUM type to represent the consolidated status of a media plan item.
-- This new type, 'media_plan_item_status', will cover the entire lifecycle of a media item,
-- from initial drafting and content generation through to scheduling and final publication.
CREATE TYPE public.media_plan_item_status AS ENUM (
    'draft',
    'queued_for_generation',
    'generation_in_progress',
    'ready_for_review',
    'approved',
    'scheduled',
    'published',
    'failed'
);

-- Step 2: Add new nullable columns to the 'media_plan_items' table.
-- These columns are being migrated from the deprecated 'content' table to consolidate all
-- media-related information into a single, unified table. This change simplifies the data model
-- and eliminates the need for joins between 'media_plan_items' and 'content'.
ALTER TABLE public.media_plan_items
ADD COLUMN content_body jsonb,
ADD COLUMN scheduled_at TIMESTAMPTZ,
ADD COLUMN published_at TIMESTAMPTZ,
ADD COLUMN image_url TEXT,
ADD COLUMN video_url TEXT,
ADD COLUMN video_script TEXT,
ADD COLUMN carousel_slides jsonb,
ADD COLUMN carousel_slides_text TEXT,
ADD COLUMN landing_page_html TEXT;

-- Step 3: Update the 'status' column in 'media_plan_items' to use the new ENUM type.
-- This step standardizes the status tracking for all media plan items under the new, more
-- comprehensive 'media_plan_item_status' type. The 'USING' clause ensures that existing
-- status values are correctly cast to the new type.
ALTER TABLE public.media_plan_items
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.media_plan_items
ALTER COLUMN status TYPE public.media_plan_item_status USING status::text::public.media_plan_item_status;

ALTER TABLE public.media_plan_items
ALTER COLUMN status SET DEFAULT 'draft';

-- Step 4: Data Migration from 'content' and 'content_generation_queue'.
-- This section transfers existing data from the old tables ('content' and 'content_generation_queue')
-- to the updated 'media_plan_items' table to ensure data continuity.

-- Migrate data from the 'content' table
UPDATE public.media_plan_items mpi
SET
  content_body = c.content_body,
  scheduled_at = c.scheduled_at,
  published_at = c.published_at,
  image_url = c.image_url,
  video_url = c.video_url,
  video_script = c.video_script,
  carousel_slides = c.carousel_slides,
  carousel_slides_text = c.carousel_slides_text,
  landing_page_html = c.landing_page_html,
  status = CASE
    WHEN c.status = 'draft' THEN 'ready_for_review'::public.media_plan_item_status
    WHEN c.status = 'approved' THEN 'approved'::public.media_plan_item_status
    WHEN c.status = 'scheduled' THEN 'scheduled'::public.media_plan_item_status
    WHEN c.status = 'published' THEN 'published'::public.media_plan_item_status
    ELSE mpi.status
  END
FROM public.content c
WHERE mpi.id = c.media_plan_item_id;

-- Update status for items in the 'content_generation_queue'
UPDATE public.media_plan_items mpi
SET status = 'queued_for_generation'::public.media_plan_item_status
FROM public.content_generation_queue q
WHERE mpi.id = q.media_plan_item_id AND q.status = 'pending';

-- The 'content' and 'content_generation_queue' tables are not being dropped,
-- as per the requirement to keep them for backup purposes.
