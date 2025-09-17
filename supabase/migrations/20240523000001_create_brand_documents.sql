
create table brand_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table brand_documents enable row level security;

create policy "Users can view their own brand documents."
on brand_documents for select
using (auth.uid() = user_id);

create policy "Users can insert their own brand documents."
on brand_documents for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own brand documents."
on brand_documents for delete
using (auth.uid() = user_id);

-- Add bucket and policies for brand documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand_documents', 'brand_documents', false, 5242880, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);

create policy "Users can view their own document folder."
on storage.objects for select
using (bucket_id = 'brand_documents' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "Users can upload to their own document folder."
on storage.objects for insert
with check (bucket_id = 'brand_documents' and auth.uid() = (storage.foldername(name))[1]::uuid);

create policy "Users can delete their own documents."
on storage.objects for delete
using (bucket_id = 'brand_documents' and auth.uid() = (storage.foldername(name))[1]::uuid);
