
-- Adds a 'connections' JSONB column to the user_channel_settings table.
-- This column is designed to hold an array of connection objects,
-- allowing for flexible storage of multiple social media accounts (e.g., several Instagram pages)
-- under a single channel setting for a user.
ALTER TABLE public.user_channel_settings
ADD COLUMN connections jsonb DEFAULT '[]'::jsonb;

-- Add a comment for clarity in the database schema.
COMMENT ON COLUMN public.user_channel_settings.connections IS 'Stores an array of social media connection objects, e.g., multiple Instagram accounts, each with its own token, ID, and active status.';

    