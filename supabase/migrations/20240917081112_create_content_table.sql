
create type public.content_status as enum ('draft', 'approved', 'scheduled', 'published');

create table public.content (
    id uuid default gen_random_uuid() not null,
    created_at timestamp with time zone not null default now(),
    user_id uuid not null,
    offering_id uuid,
    content_body jsonb,
    status content_status not null default 'draft'::public.content_status,
    scheduled_at timestamp with time zone,
    constraint content_pkey primary key (id),
    constraint content_offering_id_fkey foreign key (offering_id) references offerings (id) on delete cascade,
    constraint content_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

alter table public.content enable row level security;

create policy "Users can see their own content"
on public.content for select
using (auth.uid() = user_id);

create policy "Users can insert their own content"
on public.content for insert
with check (auth.uid() = user_id);

create policy "Users can update their own content"
on public.content for update
using (auth.uid() = user_id);

create policy "Users can delete their own content"
on public.content for delete
using (auth.uid() = user_id);
