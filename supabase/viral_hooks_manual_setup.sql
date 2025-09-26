-- 1. Create the table
CREATE TABLE viral_hooks (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  hook_text text NOT NULL,
  created_at timestamp WITH time zone DEFAULT now() NOT NULL
);

-- 2. Seed with initial global hooks
INSERT INTO viral_hooks (category, hook_text)
VALUES
  ('Curiosity', 'You’re doing this completely wrong…'),
  ('Curiosity', 'Nobody talks about this, but it changes everything.'),
  ('Value', 'Here’s how to do [X] in under 10 minutes.'),
  ('Value', 'Save this if you want to [achieve outcome].'),
  ('Shock', 'I was today years old when I learned this.'),
  ('Shock', 'This shouldn’t have worked… but it did.'),
  ('Relatability', 'Tell me you’re a [blank] without telling me…'),
  ('Relatability', 'If you’ve ever said ‘I’ll start tomorrow,’ this is for you.'),
  ('FOMO', 'If you’re not doing this in 2025, you’re already behind.'),
  ('FOMO', 'This trend is peaking—don’t miss it.');

-- 3. Enable Row Level Security (RLS)
ALTER TABLE viral_hooks ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for RLS
-- Allow users to read all global hooks (user_id IS NULL)
CREATE POLICY "Allow read access to global hooks"
ON viral_hooks
FOR SELECT
TO authenticated
USING (user_id IS NULL);

-- Allow users to read their own custom hooks
CREATE POLICY "Allow read access to own hooks"
ON viral_hooks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
  
-- Allow users to create hooks for themselves
CREATE POLICY "Allow insert for own hooks"
ON viral_hooks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own hooks
CREATE POLICY "Allow update for own hooks"
ON viral_hooks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own hooks
CREATE POLICY "Allow delete for own hooks"
ON viral_hooks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
