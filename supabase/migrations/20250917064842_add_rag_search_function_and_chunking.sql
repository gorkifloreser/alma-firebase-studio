
-- Enable the vector extension
create extension if not exists vector with schema extensions;

-- Alter table to change embedding dimension and add document group id
alter table public.brand_documents
add column if not exists document_group_id uuid,
add column if not exists content text;

-- Drop the existing function if it exists, to avoid signature mismatch errors
drop function if exists public.match_brand_documents(vector, double precision, integer, uuid);
drop function if exists public.match_brand_documents(query_embedding vector, match_threshold double precision, match_count integer, p_user_id uuid);


-- Create the database function to search for matching documents
create or replace function public.match_brand_documents(
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

-- Add RLS policy for the new function
grant execute on function public.match_brand_documents to authenticated;
