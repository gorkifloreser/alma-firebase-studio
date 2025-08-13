# To-Do List

- [ ] Fix the password reset flow.
  - **Issue:** Users are receiving an `error=access_denied&error_code=otp_expired` error after clicking the password reset link in the email.
  - **Context:** The server action is likely not handling the code exchange for a session correctly before attempting to update the password. Requires further investigation into the Supabase auth flow for password resets.
