-- Add scheduling and planning fields to the content table
alter table content
add column if not exists status
  text not null default 'draft',
add column if not exists scheduled_at
  timestamp with time zone,
add column if not exists scheduled_for_channel
  jsonb,
add column if not exists published_at
  timestamp with time zone,
add column if not exists source_plan
  jsonb;
