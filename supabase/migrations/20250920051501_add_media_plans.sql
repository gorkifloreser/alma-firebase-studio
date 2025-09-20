
-- Create the media_plans table
CREATE TABLE IF NOT EXISTS public.media_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL UNIQUE REFERENCES public.funnels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    plan_items JSONB
);

-- Enable Row Level Security
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users for their own media plans
CREATE POLICY "Allow all access for owner" ON public.media_plans
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
-- Add a new column to the funnels table to link to the media plan
ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS media_plan_id UUID REFERENCES public.media_plans(id) ON DELETE SET NULL;

-- Create an index on the new foreign key
CREATE INDEX IF NOT EXISTS idx_funnels_media_plan_id ON public.funnels(media_plan_id);

-- Create the content_generation_queue table
CREATE TABLE IF NOT EXISTS public.content_generation_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    offering_id UUID NOT NULL REFERENCES public.offerings(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    source_plan_item JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for the queue
ALTER TABLE public.content_generation_queue ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users for their own queue items
CREATE POLICY "Allow all access for owner on queue" ON public.content_generation_queue
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add media_plan_item_id to content table
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS media_plan_item_id TEXT;
