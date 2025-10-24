-- 1. Create the 'benchmarking_reports' table
-- This table will store the results of competitor analysis.
CREATE TABLE public.benchmarking_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  market_summary text NOT NULL,
  competitors jsonb NOT NULL,
  CONSTRAINT benchmarking_reports_pkey PRIMARY KEY (id),
  CONSTRAINT benchmarking_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Row Level Security (RLS)
-- This is a crucial security step to ensure users can only access their own data.
ALTER TABLE public.benchmarking_reports ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- These policies define the rules for who can see, create, update, or delete rows.

-- Policy to allow users to read their own reports.
CREATE POLICY "Allow individual read access on benchmarking_reports"
ON public.benchmarking_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Policy to allow users to create new reports for themselves.
CREATE POLICY "Allow individual insert access on benchmarking_reports"
ON public.benchmarking_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own reports.
CREATE POLICY "Allow individual update access on benchmarking_reports"
ON public.benchmarking_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own reports.
CREATE POLICY "Allow individual delete access on benchmarking_reports"
ON public.benchmarking_reports
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Add comments for clarity
COMMENT ON TABLE public.benchmarking_reports IS 'Stores saved competitor and inspirational brand analysis reports.';
COMMENT ON COLUMN public.benchmarking_reports.market_summary IS 'The summary phrase used to generate the competitor search.';
COMMENT ON COLUMN public.benchmarking_reports.competitors IS 'A JSONB array of competitor objects found by the AI.';
