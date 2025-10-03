
-- Step 1: Drop the now-unused foreign key constraint from the 'content' table.
-- This constraint linked 'content' to 'media_plan_items', which is no longer needed
-- as 'media_plan_items' is now the primary content table.
ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_media_plan_item_id_fkey;

-- Step 2: Drop the 'media_plan_item_id' column from the 'content' table.
-- This column is obsolete as the relationship is no longer maintained.
ALTER TABLE public.content
DROP COLUMN IF EXISTS media_plan_item_id;

-- Step 3: Drop the 'funnel_id' column from the 'content' table.
-- The relationship to the funnel is now managed through the 'media_plan_items' -> 'media_plans' hierarchy.
ALTER TABLE public.content
DROP COLUMN IF EXISTS funnel_id;

-- Step 4: Drop the foreign key constraint from the 'content_generation_queue' table.
-- This removes the dependency on 'media_plan_items' from the now-deprecated queue table.
ALTER TABLE public.content_generation_queue
DROP CONSTRAINT IF EXISTS fk_media_plan_item;

-- Step 5: Drop the 'media_plan_item_id' column from the 'content_generation_queue' table.
-- This column is no longer needed as the queue is deprecated.
ALTER TABLE public.content_generation_queue
DROP COLUMN IF EXISTS media_plan_item_id;
