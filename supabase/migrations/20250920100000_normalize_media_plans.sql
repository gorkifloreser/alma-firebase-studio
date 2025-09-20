
-- Create the new table to store individual media plan items
CREATE TABLE public.media_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_plan_id UUID NOT NULL REFERENCES public.media_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES public.offerings(id) ON DELETE SET NULL,
    channel TEXT,
    format TEXT,
    copy TEXT,
    hashtags TEXT,
    creative_prompt TEXT,
    conceptual_step JSONB,
    suggested_post_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS to the new table
ALTER TABLE public.media_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage their own media plan items"
ON public.media_plan_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove the old JSONB column from the media_plans table
ALTER TABLE public.media_plans
DROP COLUMN IF EXISTS plan_items;
