-- Alter the content table to add scheduling and publishing information

-- Add a column to store the scheduled publication time
alter table public.content
add column scheduled_at timestamp with time zone;

-- Add a column to specify the target channel for the scheduled post
alter table public.content
add column scheduled_for_channel text;

-- Add a column to store the actual publication time
alter table public.content
add column published_at timestamp with time zone;
