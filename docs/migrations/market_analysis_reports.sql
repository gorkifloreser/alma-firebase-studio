-- Create the table to store market analysis reports
CREATE TABLE public.market_analysis_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    title text NOT NULL,
    report_data jsonb NOT NULL,
    CONSTRAINT market_analysis_reports_pkey PRIMARY KEY (id),
    CONSTRAINT market_analysis_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add an index on user_id for faster queries
CREATE INDEX market_analysis_reports_user_id_idx ON public.market_analysis_reports USING btree (user_id);

-- Enable Row Level Security
ALTER TABLE public.market_analysis_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow users to perform all actions on their own reports
CREATE POLICY "Allow full access to own reports"
ON public.market_analysis_reports
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a comment for clarity
COMMENT ON TABLE public.market_analysis_reports IS 'Stores AI-generated market analysis reports for users.';
