-- Enable the pg_vector extension
create extension if not exists vectors with schema extensions;

-- Add columns for RAG to the brand_documents table
alter table public.brand_documents
add column content text,
add column embedding vector(768);

-- Add a policy to allow select on the new columns for authenticated users
drop policy if exists "Allow authenticated user to select own documents" on public.brand_documents;
create policy "Allow authenticated user to select own documents"
on public.brand_documents for select
to authenticated
using (auth.uid() = user_id);

-- Add a policy to allow update on the new columns for authenticated users
drop policy if exists "Allow authenticated user to update own documents" on public.brand_documents;
create policy "Allow authenticated user to update own documents"
on public.brand_documents for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
