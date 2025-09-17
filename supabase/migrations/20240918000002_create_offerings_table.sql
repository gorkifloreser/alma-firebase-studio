-- supabase/migrations/20240918000002_create_offerings_table.sql

CREATE TABLE "public"."offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" "timestamp with time zone" DEFAULT "now"() NOT NULL,
    "title" "jsonb" NOT NULL,
    "description" "jsonb" NOT NULL,
    "type" "text" NOT NULL,
    "contextual_notes" "text"
);

ALTER TABLE "public"."offerings" OWNER TO "postgres";

ALTER TABLE ONLY "public"."offerings"
    ADD CONSTRAINT "offerings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."offerings"
    ADD CONSTRAINT "offerings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."offerings" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to manage their own offerings"
    ON "public"."offerings"
    FOR ALL
    TO "authenticated"
    USING (("auth"."uid"() = "user_id"))
    WITH CHECK (("auth"."uid"() = "user_id"));
