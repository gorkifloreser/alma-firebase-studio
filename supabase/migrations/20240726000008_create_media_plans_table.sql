
-- Create the media_plans table
CREATE TABLE IF NOT EXISTS public.media_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    plan_items JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_plans_user_id ON public.media_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_funnel_id ON public.media_plans(funnel_id);

-- Comments
COMMENT ON TABLE public.media_plans IS 'Stores the orchestrated media plans for each strategy (funnel).';
COMMENT ON COLUMN public.media_plans.plan_items IS 'A JSON array of content ideas, including formats, copy, and AI prompts.';

-- Row Level Security
ALTER TABLE public.media_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to own media plans" ON public.media_plans;
CREATE POLICY "Allow all access to own media plans"
ON public.media_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_media_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_media_plans_update ON public.media_plans;
CREATE TRIGGER on_media_plans_update
BEFORE UPDATE ON public.media_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_media_plans_updated_at();

