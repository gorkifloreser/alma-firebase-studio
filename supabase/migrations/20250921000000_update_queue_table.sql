-- Alter the content_generation_queue table to use a foreign key relationship
-- instead of a JSONB column for the source media plan item.

-- Add the new column to store the foreign key
ALTER TABLE public.content_generation_queue
ADD COLUMN media_plan_item_id UUID;

-- Add the foreign key constraint to link to the media_plan_items table
-- Assuming ON DELETE CASCADE is desired, so if a media plan item is deleted,
-- the corresponding queue item is also removed.
ALTER TABLE public.content_generation_queue
ADD CONSTRAINT fk_media_plan_item
FOREIGN KEY (media_plan_item_id)
REFERENCES public.media_plan_items(id)
ON DELETE CASCADE;

-- Create an index for faster lookups on the new foreign key
CREATE INDEX idx_content_generation_queue_media_plan_item_id
ON public.content_generation_queue(media_plan_item_id);

-- Drop the old JSONB column as it's now redundant
ALTER TABLE public.content_generation_queue
DROP COLUMN source_plan_item;
