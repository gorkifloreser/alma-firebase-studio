-- Drop the old function with its specific signature to avoid ambiguity.
DROP FUNCTION IF EXISTS public.match_brand_documents(vector, double precision, integer, uuid);

-- Recreate the function with the corrected return type and logic.
create or replace function public.match_brand_documents (
  query_embedding vector(768),
  match_threshold double precision,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  file_name text,
  similarity double precision
)
language plpgsql
as $$
begin
  return query
  select
    brand_documents.id,
    brand_documents.content,
    brand_documents.file_name,
    1 - (brand_documents.embedding <=> query_embedding) as similarity
  from brand_documents
  where brand_documents.user_id = p_user_id
    and 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
