
-- Add funnel_type to funnels table
ALTER TABLE public.funnels
ADD COLUMN funnel_type TEXT CHECK (funnel_type IN ('Awareness', 'Consideration', 'Conversion', 'Nurture'));

-- Add funnel_id to content table
ALTER TABLE public.content
ADD COLUMN funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;
