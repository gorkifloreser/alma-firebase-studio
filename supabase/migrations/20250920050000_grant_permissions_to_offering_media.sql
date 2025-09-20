
-- Grant usage on the schema to the authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions for the authenticated role on the offering_media table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offering_media TO authenticated;
