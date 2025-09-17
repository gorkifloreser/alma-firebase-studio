
-- Drop the media_plan column from funnels if it exists
alter table "public"."funnels" drop column if exists "media_plan";

-- Drop the media_plans table if it exists to ensure a clean slate
drop table if exists "public"."media_plans";

-- Create the media_plans table
create table "public"."media_plans" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null,
    "funnel_id" uuid not null,
    "plan_items" jsonb
);

-- Enable Row Level Security on the new table
alter table "public"."media_plans" enable row level security;

-- Create Primary Key
alter table "public"."media_plans" add constraint "media_plans_pkey" primary key using index ("id");

-- Create Foreign Key for user_id
alter table "public"."media_plans" add constraint "media_plans_user_id_fkey" foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

-- Create Foreign Key for funnel_id with cascade delete
alter table "public"."media_plans" add constraint "media_plans_funnel_id_fkey" foreign key (funnel_id) references funnels(id) on update cascade on delete cascade;

-- Make the funnel_id unique to enforce a one-to-one relationship
alter table "public"."media_plans" add constraint "media_plans_funnel_id_key" unique (funnel_id);


-- RLS Policies for media_plans
drop policy if exists "Enable all for users based on user_id" on "public"."media_plans";
create policy "Enable all for users based on user_id"
on "public"."media_plans" for all
to authenticated
using ((auth.uid() = user_id));
