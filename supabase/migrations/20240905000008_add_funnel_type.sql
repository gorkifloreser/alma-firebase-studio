
-- Add funnel_type to funnels table with specific allowed values
ALTER TABLE public.funnels
ADD COLUMN funnel_type TEXT CHECK (funnel_type IN ('Lead Magnet', 'Direct Offer', 'Nurture & Convert', 'Onboarding & Habit'));

-- Add funnel_id to content table to associate content with a specific funnel
ALTER TABLE public.content
ADD COLUMN funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;

