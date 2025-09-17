-- Create the "offering_type" enum
CREATE TYPE "offering_type" AS ENUM ('Product', 'Service', 'Event');

-- Create the "offerings" table
CREATE TABLE "offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamptz DEFAULT "now"() NOT NULL,
    "title" "jsonb" NOT NULL,
    "description" "jsonb" NOT NULL,
    "type" "offering_type" NOT NULL,
    "contextual_notes" "text",
    CONSTRAINT "offerings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offerings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE "offerings" ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own offerings" ON "offerings"
    FOR SELECT
    USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert their own offerings" ON "offerings"
    FOR INSERT
    WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update their own offerings" ON "offerings"
    FOR UPDATE
    USING (("auth"."uid"() = "user_id"))
    WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete their own offerings" ON "offerings"
    FOR DELETE
    USING (("auth"."uid"() = "user_id"));
