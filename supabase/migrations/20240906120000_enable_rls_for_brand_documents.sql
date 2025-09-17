-- Enable Row Level Security on the brand_documents table
alter table "public"."brand_documents" enable row level security;

-- Create policy for allowing users to view their own documents
create policy "Allow users to view their own documents"
on "public"."brand_documents" for select
using (auth.uid() = user_id);

-- Create policy for allowing users to insert their own documents
create policy "Allow users to insert their own documents"
on "public"."brand_documents" for insert
with check (auth.uid() = user_id);

-- Create policy for allowing users to update their own documents
create policy "Allow users to update their own documents"
on "public"."brand_documents" for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create policy for allowing users to delete their own documents
create policy "Allow users to delete their own documents"
on "public"."brand_documents" for delete
using (auth.uid() = user_id);
