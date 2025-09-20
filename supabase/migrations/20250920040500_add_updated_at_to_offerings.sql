
ALTER TABLE "public"."offerings"
ADD COLUMN "updated_at" timestamptz DEFAULT now();

-- Create a trigger function to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the 'offerings' table
CREATE TRIGGER on_offering_update
BEFORE UPDATE ON "public"."offerings"
FOR EACH ROW
EXECUTE PROCEDURE handle_updated_at();
