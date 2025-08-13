
-- Add a unique constraint to the user_id column in the brand_hearts table.
-- This is crucial for the upsert operation to correctly identify and update
-- an existing record for a user, rather than inserting a duplicate.
ALTER TABLE public.brand_hearts
ADD CONSTRAINT brand_hearts_user_id_key UNIQUE (user_id);

-- Add a trigger to automatically update the updated_at timestamp whenever a row is modified.
-- This ensures we always have an accurate timestamp for the last update without
-- needing to manage it from the application code.
create trigger handle_updated_at before update on brand_hearts
  for each row execute procedure moddatetime (updated_at);
