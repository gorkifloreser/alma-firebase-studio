
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    offering_id UUID REFERENCES public.offerings(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for funnels
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;

-- Policies for funnels
CREATE POLICY "Users can manage their own funnels"
ON funnels
FOR ALL
USING (auth.uid() = user_id);


CREATE TABLE funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL, -- e.g., 'landing_page', 'follow_up'
    title JSONB, -- For bilingual content: { "primary": "...", "secondary": "..." }
    content JSONB, -- For bilingual content: { "primary": "...", "secondary": "..." }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_funnel_steps_funnel_id ON funnel_steps(funnel_id);
CREATE INDEX idx_funnel_steps_user_id ON funnel_steps(user_id);

-- Enable RLS for funnel_steps
ALTER TABLE funnel_steps ENABLE ROW LEVEL SECURITY;

-- Policies for funnel_steps
CREATE POLICY "Users can manage their own funnel steps"
ON funnel_steps
FOR ALL
USING (auth.uid() = user_id);
