-- This script adds the necessary columns to the social_connections table
-- to store the account ID and name from social media providers like Meta.

-- Add the account_id column to store the unique identifier of the connected social account (e.g., Instagram User ID).
ALTER TABLE public.social_connections
ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Add the account_name column to store the display name or username of the connected social account (e.g., @username).
ALTER TABLE public.social_connections
ADD COLUMN IF NOT EXISTS account_name TEXT;
