-- This script sets up a cron job to automatically run the 'post-scheduler' Edge Function.
--
-- How to use:
-- 1. Go to the "SQL Editor" in your Supabase dashboard.
-- 2. Copy and paste the entire content of this file.
-- 3. In the line `SELECT net.http_post(...)`, REPLACE `[YOUR_PROJECT_REF]` with your actual Supabase project reference ID.
-- 4. Click "Run".

-- Step 1: Enable the pg_cron extension to schedule jobs.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Enable the http extension to allow database to make web requests.
CREATE EXTENSION IF NOT EXISTS http;

-- Step 3: Schedule the job.
-- This schedules the 'post-scheduler' function to be called every 15 minutes.
-- IMPORTANT: Replace [YOUR_PROJECT_REF] with your project's reference ID.
-- You can find it in your Supabase project's URL (e.g., abcdefghijklmnopqrst.supabase.co)
SELECT cron.schedule(
  'invoke_post_scheduler',
  '*/15 * * * *', -- This means "every 15 minutes"
  $$
    SELECT net.http_post(
      url:='https://[YOUR_PROJECT_REF].supabase.co/functions/v1/post-scheduler',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjgxMDgwMDAsImV4cCI6MTg1OTg3NTIwMH0.dx7xVwnA22G32K3gPVKFL2gmz28Y-p5z5e1s2v5x2u4"}'
    )
  $$
);

-- Note: The Authorization Bearer token above is the default Supabase anon key for local development.
-- For production, you should use the actual anon key for your project. Since this function is just
-- triggering a process and not sending sensitive data in its own call, using the anon key is acceptable.

-- (Optional) To view your scheduled jobs:
-- SELECT * FROM cron.job;

-- (Optional) To delete the job if needed:
-- SELECT cron.unschedule('invoke_post_scheduler');
