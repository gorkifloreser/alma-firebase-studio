# To-Do List

- [ ] Fix the password reset flow.
  - **Issue:** Users are receiving an `error=access_denied&error_code=otp_expired` error after clicking the password reset link in the email.
  - **Context:** The server action is likely not handling the code exchange for a session correctly before attempting to update the password. Requires further investigation into the Supabase auth flow for password resets.
- [ ] Remove temporary hardcoded user data and re-enable authentication checks before production.
  - **Context:** Authentication checks in `src/middleware.ts`, `src/app/page.tsx`, `src/app/settings/page.tsx`, and `src/app/settings/actions.ts` have been temporarily disabled to facilitate development without requiring login. These must be re-instated.
- [ ] Refactor data transformation to happen exclusively on the server-side.
  - **Context:** The client-side components (e.g., `src/app/artisan/page.tsx`) are sometimes receiving `snake_case` data and are responsible for mapping it to `camelCase`. This is error-prone and violates our convention. The transformation should happen inside the server actions before the data is returned to the client.
  - **Files to Fix:**
    -   Review functions within `src/app/artisan/actions.ts`, `src/app/offerings/actions.ts`, and other server action files.
    -   Ensure that any data fetched from the database (in `snake_case`) is transformed to `camelCase` before being returned to the client.
    -   Update client components like `src/app/artisan/page.tsx` to remove any manual mapping and expect `camelCase` properties directly from server action responses.