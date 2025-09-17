-- Enable the pg_vector extension
create extension if not exists vector with schema public;

-- Add content and embedding columns to the brand_documents table
alter table public.brand_documents
add column content text,
add column embedding public.vector(1536);
