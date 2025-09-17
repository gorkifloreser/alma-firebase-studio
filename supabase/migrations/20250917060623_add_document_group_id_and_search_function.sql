
-- Enable the vector extension
create extension if not exists vector;

-- Alter the table to match the new schema
alter table public.brand_documents
add column document_group_id uuid,
alter column embedding type vector(768);


-- Create a function to search for matching brand document chunks
create or replace function match_brand_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    brand_documents.id,
    brand_documents.content,
    1 - (brand_documents.embedding <=> query_embedding) as similarity
  from brand_documents
  where brand_documents.user_id = p_user_id
    and 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
