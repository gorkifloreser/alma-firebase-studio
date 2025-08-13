# To-Do List

- [ ] Fix the password reset flow.
  - **Issue:** Users are receiving an `error=access_denied&error_code=otp_expired` error after clicking the password reset link in the email.
  - **Context:** The server action is likely not handling the code exchange for a session correctly before attempting to update the password. Requires further investigation into the Supabase auth flow for password resets.
- [ ] Remove temporary hardcoded user data and re-enable authentication checks before production.
  - **Context:** Authentication checks in `src/middleware.ts`, `src/app/page.tsx`, `src/app/settings/page.tsx`, and `src/app/settings/actions.ts` have been temporarily disabled to facilitate development without requiring login. These must be re-instated.
