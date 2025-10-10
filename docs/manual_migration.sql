-- This script adds a 'connections' JSONB column to the user_channel_settings table
-- and cleans up old columns from previous refactoring attempts.

-- Step 1: Add the new 'connections' column of type JSONB.
-- It will store an array of connection objects.
ALTER TABLE public.user_channel_settings
ADD COLUMN connections jsonb DEFAULT '[]'::jsonb;

-- Step 2: Add a comment for clarity in the database schema.
COMMENT ON COLUMN public.user_channel_settings.connections IS 'Stores an array of social media connection objects, e.g., multiple Instagram accounts, each with its own token, ID, and active status.';

-- Step 3: (Cleanup) Drop old, now redundant columns if they exist from previous refactoring attempts.
-- This ensures the table aligns with the new JSONB strategy.
ALTER TABLE public.user_channel_settings
DROP COLUMN IF EXISTS provider,
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS expires_at,
DROP COLUMN IF EXISTS account_id,
DROP COLUMN IF EXISTS instagram_account_id,
DROP COLUMN IF EXISTS account_name,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS account_picture_url;
