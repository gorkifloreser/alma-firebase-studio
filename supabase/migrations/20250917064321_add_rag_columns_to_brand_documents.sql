-- Enable the pgvector extension
create extension if not exists vector with schema public;

-- Add content and embedding columns to the brand_documents table
alter table public.brand_documents
add column content text,
add column embedding public.vector(1536);

-- Create a function to search for documents
create or replace function match_brand_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  file_name text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    brand_documents.id,
    brand_documents.file_name,
    brand_documents.content,
    1 - (brand_documents.embedding <=> query_embedding) as similarity
  from brand_documents
  where 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
