-- 1. Create the table for storing social media connections
CREATE TABLE public.social_connections (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL, -- Note: Should be encrypted in a production environment
  refresh_token text, -- Note: Should be encrypted in a production environment
  expires_at timestamp with time zone,
  account_id text,
  account_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Add a unique constraint to prevent multiple connections for the same user and provider
ALTER TABLE public.social_connections
ADD CONSTRAINT social_connections_user_id_provider_key UNIQUE (user_id, provider);

-- 3. Enable Row Level Security on the table
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- 4. Create a policy that allows users to perform any action (SELECT, INSERT, UPDATE, DELETE)
--    only on the rows that belong to them.
CREATE POLICY "Allow full access to own social connections"
ON public.social_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Add comments for clarity
COMMENT ON TABLE public.social_connections IS 'Stores connection details for third-party social media accounts.';
COMMENT ON COLUMN public.social_connections.provider IS 'The name of the social media provider (e.g., ''meta'', ''google'').';
COMMENT ON COLUMN public.social_connections.access_token IS 'The OAuth access token for the user''s account.';

