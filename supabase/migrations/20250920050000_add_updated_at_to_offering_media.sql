-- Add the updated_at column to the offering_media table
ALTER TABLE public.offering_media
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Create a trigger function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires before any update on the offering_media table
CREATE TRIGGER on_offering_media_update
BEFORE UPDATE ON public.offering_media
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
