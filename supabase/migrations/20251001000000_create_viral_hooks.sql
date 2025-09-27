-- Create the viral_hooks table to store both global and user-specific hooks
CREATE TABLE IF NOT EXISTS public.viral_hooks (
  id bigint NOT NULL,
  user_id uuid,
  category text NOT NULL,
  hook_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create the sequence for the primary key
CREATE SEQUENCE IF NOT EXISTS public.viral_hooks_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Link the sequence to the table's primary key
ALTER TABLE public.viral_hooks ALTER COLUMN id SET DEFAULT nextval('public.viral_hooks_id_seq'::regclass);

-- Set the owner of the table and sequence to the postgres user
ALTER TABLE public.viral_hooks OWNER TO postgres;
ALTER SEQUENCE public.viral_hooks_id_seq OWNER TO postgres;
ALTER SEQUENCE public.viral_hooks_id_seq OWNED BY public.viral_hooks.id;

-- Add the primary key constraint
ALTER TABLE ONLY public.viral_hooks
  ADD CONSTRAINT viral_hooks_pkey PRIMARY KEY (id);

-- Add the foreign key constraint to the users table
ALTER TABLE ONLY public.viral_hooks
  ADD CONSTRAINT viral_hooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clear existing global hooks to prevent duplicates before seeding
DELETE FROM public.viral_hooks WHERE user_id IS NULL;

-- Seed the table with the complete list of 50 global hooks
INSERT INTO public.viral_hooks (category, hook_text) VALUES
('Curiosity', 'You’re doing this completely wrong…'),
('Curiosity', 'Nobody talks about this, but it changes everything.'),
('Curiosity', 'Watch what happens when I try this for the first time…'),
('Curiosity', 'What if you could [achieve result] without [pain point]?'),
('Curiosity', 'Most people don’t know this secret about [topic]…'),
('Curiosity', 'Here’s what I learned after 30 days of doing [X].'),
('Curiosity', 'The results were not what I expected…'),
('Curiosity', 'Everyone’s doing this wrong—here’s how to fix it.'),
('Curiosity', 'Wait—why does nobody teach this?'),
('Curiosity', 'I ran this experiment so you don’t have to.'),
('Value', 'Here’s how to do [X] in under 10 minutes.'),
('Value', 'Save this if you want to [achieve outcome].'),
('Value', 'Don’t scroll—this will change how you [task].'),
('Value', 'This tool saved me hours every week.'),
('Value', 'The one tip that made everything click…'),
('Value', 'Steal my exact process for [outcome]…'),
('Value', 'These 3 things boosted my [result] instantly.'),
('Value', 'This shortcut is too good to gatekeep.'),
('Value', 'How to go viral using just your phone.'),
('Value', 'Here’s a checklist I wish I had when I started.'),
('Shock', 'I was today years old when I learned this.'),
('Shock', 'This shouldn''t have worked… but it did.'),
('Shock', 'I made this one mistake and it cost me $5,000.'),
('Shock', 'No one warned me about this.'),
('Shock', 'This trend got me banned—here’s why.'),
('Shock', 'This is going to sound insane, but hear me out…'),
('Shock', 'I can’t believe I’m posting this…'),
('Shock', 'This might be controversial, but…'),
('Shock', 'It’s wild how easy this is (once you know the trick).'),
('Shock', 'Every expert I follow got this wrong.'),
('Relatibility', 'Tell me you’re a [blank] without telling me…'),
('Relatibility', 'POV: You just opened your laptop and instantly forgot why.'),
('Relatibility', 'If you’ve ever said ‘I’ll start tomorrow,’ this is for you.'),
('Relatibility', 'This is your sign to stop overthinking it.'),
('Relatibility', 'Raise your hand if this has happened to you 🙋‍♀️'),
('Relatibility', 'If this is you, you’re not alone.'),
('Relatibility', 'You’re not the only one who [common struggle].'),
('Relatibility', 'Let’s be real—nobody talks about this part.'),
('Relatibility', 'When you pretend everything’s fine but your calendar says otherwise.'),
('Relatibility', 'The ‘I can fix it’ phase… yeah, we’ve all been there.'),
('FOMO', 'If you’re not doing this in 2025, you’re already behind.'),
('FOMO', 'You have 48 hours to jump on this trend.'),
('FOMO', 'This trend is peaking—don’t miss it.'),
('FOMO', 'Here’s what everyone will be doing next month.'),
('FOMO', 'Mark my words, this is about to blow up.'),
('FOMO', 'Every creator is talking about this—are you?'),
('FOMO', 'The clock is ticking—this only works right now.'),
('FOMO', 'Your competitors already know this—do you?'),
('FOMO', 'This strategy won’t work in 6 months.'),
('FOMO', 'This is your chance to get in before it’s saturated.');

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.viral_hooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts before creating new ones
DROP POLICY IF EXISTS "Allow read access to global hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Allow read access to own hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Allow insert for own hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Allow update for own hooks" ON public.viral_hooks;
DROP POLICY IF EXISTS "Allow delete for own hooks" ON public.viral_hooks;

-- Create RLS policies
-- 1. Allow authenticated users to read all global hooks (where user_id is NULL)
CREATE POLICY "Allow read access to global hooks" ON public.viral_hooks FOR SELECT TO authenticated USING (user_id IS NULL);

-- 2. Allow users to read their own custom hooks
CREATE POLICY "Allow read access to own hooks" ON public.viral_hooks FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Allow users to create hooks for themselves
CREATE POLICY "Allow insert for own hooks" ON public.viral_hooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to update their own hooks
CREATE POLICY "Allow update for own hooks" ON public.viral_hooks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. Allow users to delete their own hooks
CREATE POLICY "Allow delete for own hooks" ON public.viral_hooks FOR DELETE TO authenticated USING (auth.uid() = user_id);
