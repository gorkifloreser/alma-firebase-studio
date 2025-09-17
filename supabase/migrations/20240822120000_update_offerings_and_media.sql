
-- Add new columns to the offerings table
ALTER TABLE "public"."offerings"
ADD COLUMN "price" numeric,
ADD COLUMN "event_date" timestamptz,
ADD COLUMN "duration" text;

-- Create the offering_media table
CREATE TABLE "public"."offering_media" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "offering_id" uuid NOT NULL,
    "media_url" text NOT NULL,
    "media_type" text NOT NULL,
    "user_id" uuid NOT NULL,
    CONSTRAINT offering_media_pkey PRIMARY KEY (id),
    CONSTRAINT offering_media_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE,
    CONSTRAINT offering_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS for the new table
ALTER TABLE "public"."offering_media" ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "Allow authenticated users to manage their own media"
ON "public"."offering_media"
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
