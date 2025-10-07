-- Add a new, nullable column to store the Instagram Business Account ID, separate from the Facebook Page ID.
ALTER TABLE public.social_connections
ADD COLUMN instagram_account_id TEXT;

-- Add a unique constraint to prevent duplicate connections for the same user, provider, and Instagram account.
ALTER TABLE public.social_connections
ADD CONSTRAINT social_connections_user_id_instagram_account_id_provider_key UNIQUE (user_id, instagram_account_id, provider);
