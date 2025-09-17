
CREATE TABLE "public"."media_plans" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "funnel_id" uuid NOT NULL,
    "plan_items" jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "public"."media_plans" OWNER TO "postgres";

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) ON DELETE CASCADE;

ALTER TABLE ONLY "public"."media_plans"
    ADD CONSTRAINT "media_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."media_plans" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated user to access their own media plans" ON "public"."media_plans"
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
