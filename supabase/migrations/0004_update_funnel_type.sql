
alter table "public"."funnels" drop constraint if exists "funnels_funnel_type_check";

alter table "public"."funnels" drop column if exists "funnel_type";

alter table "public"."funnels" add column "funnel_type" integer;

alter table "public"."funnels" add constraint "funnels_funnel_type_fkey" foreign key (funnel_type) references funnel_presets(id) on delete set null;

    