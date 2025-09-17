
-- Function to search for documents based on a query embedding
create or replace function match_brand_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    brand_documents.id::text,
    brand_documents.content,
    1 - (brand_documents.embedding <=> query_embedding) as similarity
  from brand_documents
  where brand_documents.user_id = p_user_id
    and 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
