
CREATE TABLE "public"."media_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "funnel_id" "uuid" NOT NULL,
    "plan_items" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."media_plans" OWNER TO "postgres";

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."media_plans" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual read access" ON "public"."media_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow individual insert access" ON "public"."media_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow individual update access" ON "public"."media_plans" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow individual delete access" ON "public"."media_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));

-- Update the 'content' table to link to media plan items
ALTER TABLE "public"."content"
ADD COLUMN "media_plan_item_id" "text";
