-- This migration removes the unique constraint on the funnel_id column
-- in the media_plans table. This is necessary to allow a one-to-many
-- relationship, where one funnel can have multiple media plans.

ALTER TABLE public.media_plans
DROP CONSTRAINT IF EXISTS media_plans_funnel_id_key;
