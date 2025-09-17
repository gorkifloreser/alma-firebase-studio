
-- Create the media_plans table
CREATE TABLE IF NOT EXISTS public.media_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    funnel_id uuid NOT NULL,
    plan_items jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT media_plans_pkey PRIMARY KEY (id),
    CONSTRAINT media_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT media_plans_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels (id) ON DELETE CASCADE
);

-- Enable RLS for the new table
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
DROP POLICY IF EXISTS "Users can view their own media plans." ON public.media_plans;
CREATE POLICY "Users can view their own media plans."
    ON public.media_plans FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own media plans." ON public.media_plans;
CREATE POLICY "Users can insert their own media plans."
    ON public.media_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own media plans." ON public.media_plans;
CREATE POLICY "Users can update their own media plans."
    ON public.media_plans FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media plans." ON public.media_plans;
CREATE POLICY "Users can delete their own media plans."
    ON public.media_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Add media_plan_item_id to the content table
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS media_plan_item_id uuid;
