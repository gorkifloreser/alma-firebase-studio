-- Drop the existing media_plans table if it exists
DROP TABLE IF EXISTS public.media_plans;

-- Add the media_plan_id column to the funnels table
ALTER TABLE public.funnels
ADD COLUMN media_plan_id UUID;

-- Create the new media_plans table
CREATE TABLE public.media_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL UNIQUE REFERENCES public.funnels(id) ON DELETE CASCADE,
    plan_items JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add the foreign key constraint from funnels to media_plans
ALTER TABLE public.funnels
ADD CONSTRAINT fk_media_plan
FOREIGN KEY (media_plan_id)
REFERENCES public.media_plans(id)
ON DELETE SET NULL;

-- Add a unique constraint to the media_plan_id in funnels
ALTER TABLE public.funnels
ADD CONSTRAINT funnels_media_plan_id_unique UNIQUE (media_plan_id);

-- Enable RLS for media_plans table
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for media_plans
DROP POLICY IF EXISTS "Users can view their own media plans." ON public.media_plans;
CREATE POLICY "Users can view their own media plans."
ON public.media_plans
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own media plans." ON public.media_plans;
CREATE POLICY "Users can insert their own media plans."
ON public.media_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own media plans." ON public.media_plans;
CREATE POLICY "Users can update their own media plans."
ON public.media_plans
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media plans." ON public.media_plans;
CREATE POLICY "Users can delete their own media plans."
ON public.media_plans
FOR DELETE
USING (auth.uid() = user_id);
