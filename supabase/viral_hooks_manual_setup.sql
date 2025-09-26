-- Step 1: Create the viral_hooks table
CREATE TABLE public.viral_hooks (
    id bigint NOT NULL,
    user_id uuid,
    category text NOT NULL,
    hook_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Ownership and sequence for the primary key
ALTER TABLE public.viral_hooks OWNER TO postgres;
CREATE SEQUENCE public.viral_hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.viral_hooks_id_seq OWNER TO postgres;
ALTER TABLE ONLY public.viral_hooks ALTER COLUMN id SET DEFAULT nextval('public.viral_hooks_id_seq'::regclass);
ALTER TABLE ONLY public.viral_hooks
    ADD CONSTRAINT viral_hooks_pkey PRIMARY KEY (id);

-- Foreign key to the users table
ALTER TABLE ONLY public.viral_hooks
    ADD CONSTRAINT viral_hooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Seed the table with initial global hooks
INSERT INTO public.viral_hooks (user_id, category, hook_text) VALUES
(NULL, 'Curiosity', 'You’re doing this completely wrong…'),
(NULL, 'Curiosity', 'Nobody talks about this, but it changes everything.'),
(NULL, 'Value', 'Here’s how to do [X] in under 10 minutes.'),
(NULL, 'Value', 'Save this if you want to [achieve outcome].'),
(NULL, 'Shock', 'I was today years old when I learned this.'),
(NULL, 'Shock', 'This shouldn''t have worked… but it did.'),
(NULL, 'Relatibility', 'Tell me you’re a [blank] without telling me…'),
(NULL, 'Relatibility', 'If you’ve ever said ‘I’ll start tomorrow,’ this is for you.'),
(NULL, 'FOMO', 'If you’re not doing this in 2025, you’re already behind.'),
(NULL, 'FOMO', 'This trend is peaking—don’t miss it.');

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE public.viral_hooks ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Policy 1: Allow users to read all global hooks (where user_id is NULL)
CREATE POLICY "Allow read access to global hooks" ON public.viral_hooks
    FOR SELECT
    TO authenticated
    USING (user_id IS NULL);

-- Policy 2: Allow users to read their own custom hooks
CREATE POLICY "Allow read access to own hooks" ON public.viral_hooks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 3: Allow users to create hooks for themselves
CREATE POLICY "Allow insert for own hooks" ON public.viral_hooks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow users to update their own hooks
CREATE POLICY "Allow update for own hooks" ON public.viral_hooks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 5: Allow users to delete their own hooks
CREATE POLICY "Allow delete for own hooks" ON public.viral_hooks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
