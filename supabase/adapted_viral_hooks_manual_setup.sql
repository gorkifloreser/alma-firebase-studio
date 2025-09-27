-- This script creates the table to store the user's personalized "Top 10" viral hook strategies.
-- Execute this code in your Supabase SQL Editor.

-- Create the table
CREATE TABLE IF NOT EXISTS public.adapted_viral_hooks (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_id bigint REFERENCES public.viral_hooks(id) ON DELETE SET NULL,
    original_text text,
    category text,
    relevance_score integer,
    virality_score integer,
    adapted_hook text,
    strategy text,
    visual_prompt text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.adapted_viral_hooks ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- 1. Allow users to read their own adapted hooks
CREATE POLICY "Allow read access to own adapted hooks"
ON public.adapted_viral_hooks
FOR SELECT USING (auth.uid() = user_id);

-- 2. Allow users to create adapted hooks for themselves
CREATE POLICY "Allow insert for own adapted hooks"
ON public.adapted_viral_hooks
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own adapted hooks
CREATE POLICY "Allow update for own adapted hooks"
ON public.adapted_viral_hooks
FOR UPDATE USING (auth.uid() = user_id);

-- 4. Allow users to delete their own adapted hooks
CREATE POLICY "Allow delete for own adapted hooks"
ON public.adapted_viral_hooks
FOR DELETE USING (auth.uid() = user_id);
