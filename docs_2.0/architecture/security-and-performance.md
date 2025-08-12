# Security and Performance

## Security
*   **Authentication:** Handled by Supabase Auth (JWT-based).
*   **Authorization:** Implemented in Supabase Edge Functions and via PostgreSQL Row Level Security (RLS).
*   **Data:** All sensitive data is encrypted at rest and in transit by Supabase.
*   **File Uploads:** Supabase Storage will be configured with strict policies to only allow authenticated users to upload specific file types.

## Performance
*   **Frontend:** Next.js SSR and Vercel's edge network will ensure fast initial page loads. Images will be optimized using Next/Image.
*   **Backend:** Supabase Edge Functions are globally distributed for low latency. Database queries will be optimized.
*   **API:** Edge Functions can be called directly, reducing payload size and complexity.
