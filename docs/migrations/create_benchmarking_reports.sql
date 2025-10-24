
-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.benchmarking_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate
DROP POLICY IF EXISTS "Allow individual read access" ON public.benchmarking_reports;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.benchmarking_reports;
DROP POLICY IF EXISTS "Allow individual delete access" ON public.benchmarking_reports;

-- Policy: Allow users to read their own reports
-- This policy grants SELECT permission to a user if their UID matches the user_id on the row.
CREATE POLICY "Allow individual read access"
ON public.benchmarking_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to create reports for themselves
-- This policy grants INSERT permission, checking that the user_id of the new row matches the current user's UID.
CREATE POLICY "Allow individual insert access"
ON public.benchmarking_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own reports
-- This policy grants DELETE permission if the user's UID matches the user_id on the row.
CREATE POLICY "Allow individual delete access"
ON public.benchmarking_reports
FOR DELETE
USING (auth.uid() = user_id);
