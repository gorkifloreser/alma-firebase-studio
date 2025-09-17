
ALTER TABLE "public"."funnel_steps"
ADD COLUMN "path" TEXT UNIQUE,
ADD COLUMN "data" JSONB;

COMMENT ON COLUMN "public"."funnel_steps"."path" IS 'The unique URL path for the landing page.';
COMMENT ON COLUMN "public"."funnel_steps"."data" IS 'The JSON data structure from the Puck editor for rendering the page.';
