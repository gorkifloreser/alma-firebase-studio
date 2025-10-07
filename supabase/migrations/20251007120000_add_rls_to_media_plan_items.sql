-- Enable Row Level Security on the media_plan_items table
ALTER TABLE public.media_plan_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate
DROP POLICY IF EXISTS "Allow users to select their own media plan items" ON public.media_p lan_items;
DROP POLICY IF EXISTS "Allow users to insert their own media plan items" ON public.media_plan_items;
DROP POLICY IF EXISTS "Allow users to update their own media plan items" ON public.media_plan_items;
DROP POLICY IF EXISTS "Allow users to delete their own media plan items" ON public.media_plan_items;

-- Create a policy for SELECT
-- This policy allows a user to view a media plan item if their user ID matches the user_id column.
CREATE POLICY "Allow users to select their own media plan items"
ON public.media_plan_items
FOR SELECT
USING (auth.uid() = user_id);

-- Create a policy for INSERT
-- This policy allows a user to create a new media plan item for themselves.
CREATE POLICY "Allow users to insert their own media plan items"
ON public.media_plan_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a policy for UPDATE
-- This policy allows a user to update their own media plan items.
CREATE POLICY "Allow users to update their own media plan items"
ON public.media_p lan_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a policy for DELETE
-- This policy allows a user to delete their own media plan items.
CREATE POLICY "Allow users to delete their own media plan items"
ON public.media_plan_items
FOR DELETE
USING (auth.uid() = user_id);

-- Grant all permissions to the 'authenticated' role
-- This ensures that any logged-in user can perform the actions defined by the policies above.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_plan_items TO authenticated;
