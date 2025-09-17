
ALTER TABLE public.content
ADD COLUMN scheduled_at TIMESTAMPTZ,
ADD COLUMN scheduled_for_channel TEXT;
