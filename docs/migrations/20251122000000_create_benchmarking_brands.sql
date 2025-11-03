-- This migration creates the new table to store inspirational brands.

CREATE TABLE public.benchmarking_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  brand_name text NOT NULL,
  description text,
  contact_points jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT benchmarking_brands_pkey PRIMARY KEY (id),
  CONSTRAINT benchmarking_brands_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.benchmarking_brands ENABLE ROW LEVEL SECURITY;

-- Create Policies for RLS
-- Allow users to manage their own brands
CREATE POLICY "Allow individual access to benchmarking_brands"
ON public.benchmarking_brands
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);