# Cron Job Setup for Post Scheduler

This API route (`/api/cron`) is the endpoint for triggering the automated post scheduler. It's designed to be called by a scheduled task runner (a "cron job").

## How it Works

1.  A `GET` request is made to this endpoint.
2.  The endpoint is protected by a secret key (`CRON_SECRET`) which must be passed in the `Authorization` header as a Bearer token.
3.  The function queries the `media_plan_items` table for any items with a status of `scheduled` where the `scheduled_at` timestamp is in the past.
4.  For each due post, it invokes the `publishPost` service to handle the actual publishing to social media.
5.  It logs the results of the operation.

---

## How to Set Up the Cron Job

To make this function run automatically, you need to use a cron job service to call this API route on a schedule. **You only need to choose ONE of the following methods.**

### Method 1: Supabase `pg_cron` (Recommended)

This method uses Supabase's built-in scheduler to call your Next.js API route. It's self-contained and efficient.

**Instructions:**

1.  **Set Your Cron Secret:**
    Add the following to your `.env.local` file and also to your production environment variables on Vercel/your host. This is crucial for security.
    ```
    CRON_SECRET="your_super_secret_and_random_string_here"
    ```
    *You can generate a strong secret using an online tool.*

2.  **Run the SQL Setup Script:**
    Go to the **SQL Editor** in your Supabase dashboard and run the following commands. This script does three things: enables the `pg_cron` scheduler, enables the `pg_net` extension for making HTTP requests, and schedules the job.

    ```sql
    -- 1. Enable extensions if they are not already enabled
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;

    -- 2. Grant permission for the postgres user to use pg_net
    -- This is required for the cron job to make HTTP requests.
    GRANT USAGE ON SCHEMA net TO postgres;

    -- 3. Schedule the job to run every 15 minutes
    -- This calls your Next.js API route.
    -- IMPORTANT: Replace 'https://your-app-url.com' with your actual production app URL.
    -- IMPORTANT: Replace 'your_super_secret_and_random_string_here' with the same CRON_SECRET you set in your environment variables.
    SELECT cron.schedule(
      'invoke_post_scheduler', -- Job name (can be anything)
      '*/15 * * * *',          -- Schedule: every 15 minutes
      $$
      SELECT
        net.http_post(
            url:='https://your-app-url.com/api/cron',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer your_super_secret_and_random_string_here"}'::jsonb
        );
      $$
    );

    -- Optional: To see your scheduled job, run:
    -- SELECT * FROM cron.job;

    -- Optional: To unschedule the job, use its name:
    -- SELECT cron.unschedule('invoke_post_scheduler');
    ```

### Method 2: Vercel Cron Jobs (Alternative if deploying on Vercel)

If your app is hosted on Vercel, this is another very easy method.

1.  **Set Your Cron Secret** in your Vercel project's Environment Variables settings.
2.  **Create a `vercel.json` file** in the root of your project (if you don't have one).
3.  **Add the cron job definition** to the file:
    ```json
    {
      "crons": [
        {
          "path": "/api/cron",
          "schedule": "*/15 * * * *"
        }
      ]
    }
    ```
4.  **Deploy your application.** Vercel will automatically detect this configuration and start calling your `/api/cron` endpoint. You do not need to manually configure the `Authorization` header; Vercel handles it securely by injecting the `CRON_SECRET` automatically.
