# Cron Job Setup for Post Scheduler

This API route (`/api/cron`) is the new endpoint for triggering the automated post scheduler. It replaces the previous Supabase Edge Function.

## How it Works

1.  A `GET` request is made to this endpoint.
2.  The endpoint is protected by a secret key (`CRON_SECRET`) which must be passed in the `Authorization` header.
3.  The function queries the `media_plan_items` table for any items with a status of `scheduled` where the `scheduled_at` timestamp is in the past.
4.  For each due post, it invokes the `publishPost` service to handle the actual publishing to social media.
5.  It logs the results of the operation.

## How to Set Up the Cron Job

To make this function run automatically, you need to use a cron job service to call this API route on a schedule.

**1. Set Your Cron Secret:**

First, you must set a secret key in your environment variables. This prevents unauthorized users from triggering your cron job.

Add the following to your `.env.local` file (and also to your production environment variables on Vercel/your host):

```
CRON_SECRET="your_super_secret_and_random_string_here"
```

**2. Choose a Cron Service:**

You can use any service that can make scheduled HTTP requests. Here are two popular options:

### Option A: Vercel Cron Jobs (Recommended if deploying on Vercel)

If your app is hosted on Vercel, this is the easiest method.

1.  **Create a `vercel.json` file** in the root of your project (if you don't have one already).
2.  **Add the cron job definition** to the file:

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

3.  **Deploy your application.** Vercel will automatically detect this configuration and start calling your `/api/cron` endpoint every 15 minutes. You don't need to manually configure the `Authorization` header; Vercel handles it securely.

### Option B: GitHub Actions (or any external service)

If you're not using Vercel, you can use a GitHub Action to schedule the job.

1.  **Create a new workflow file** at `.github/workflows/post_scheduler.yml`.
2.  **Add the following content:**

    ```yml
    name: Post Scheduler Cron Job

    on:
      schedule:
        # Runs every 15 minutes
        - cron: '*/15 * * * *'

    jobs:
      cron:
        runs-on: ubuntu-latest
        steps:
          - name: Call the cron endpoint
            run: |
              curl --request GET \
                --url 'https://your-app-url.com/api/cron' \
                --header 'Authorization: Bearer ${{ secrets.CRON_SECRET }}'
    ```

3.  **Set up secrets in GitHub:**
    *   Go to your GitHub repository's **Settings > Secrets and variables > Actions**.
    *   Create a new repository secret named `CRON_SECRET`.
    *   Paste the same secret key you defined in your `.env.local` file as the value.
    *   Replace `https://your-app-url.com` in the workflow file with your actual application's production URL.

That's it! Your chosen service will now automatically invoke the scheduler function, keeping your content publishing on autopilot.
