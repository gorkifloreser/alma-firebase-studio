-- supabase/migrations/20250920120000_add_campaign_dates_to_media_plans.sql

-- Add campaign start and end dates to the media_plans table
ALTER TABLE public.media_plans
ADD COLUMN IF NOT EXISTS campaign_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS campaign_end_date TIMESTAMPTZ;
