# Post Scheduler Edge Function

This function is responsible for automatically publishing scheduled content to social media platforms.

## How it Works

1.  It queries the `media_plan_items` table for any items with a status of `scheduled` where the `scheduled_at` timestamp is in the past.
2.  For each post, it retrieves the user's active social connection details (like access tokens).
3.  It calls the appropriate social media API (e.g., Instagram Graph API, Facebook Graph API) to publish the content.
4.  If successful, it updates the post's status to `published` in the database.

## Setting up the Cron Job

To make this function run automatically, you need to schedule it as a cron job in your Supabase project.

1.  **Navigate to Database > Functions** in your Supabase dashboard.
2.  Find the `post-scheduler` function and click on it.
3.  Go to the **"Schedule"** tab.
4.  **Cron Expression**: Enter `*/15 * * * *` to run the job every 15 minutes.
5.  **Timezone**: Select your preferred timezone (e.g., `UTC`).
6.  Click **"Create schedule"**.

That's it! Supabase will now automatically invoke this function every 15 minutes to check for and publish any due posts.
