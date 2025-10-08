
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.raw(`
    CREATE OR REPLACE FUNCTION match_brand_documents (
      query_embedding vector(768),
      match_threshold float,
      match_count int,
      p_user_id uuid
    )
    RETURNS TABLE (
      id uuid,
      content text,
      similarity float
    )
    LANGUAGE sql STABLE
    AS $$
      SELECT
        brand_documents.id,
        brand_documents.content,
        1 - (brand_documents.embedding <=> query_embedding) as similarity
      FROM brand_documents
      WHERE brand_documents.user_id = p_user_id
        AND 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    $$;
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.raw(`
    CREATE OR REPLACE FUNCTION match_brand_documents (
      query_embedding vector(1536),
      match_threshold float,
      match_count int,
      p_user_id uuid
    )
    RETURNS TABLE (
      id uuid,
      content text,
      similarity float
    )
    LANGUAGE sql STABLE
    AS $$
      SELECT
        brand_documents.id,
        brand_documents.content,
        1 - (brand_documents.embedding <=> query_embedding) as similarity
      FROM brand_documents
      WHERE brand_documents.user_id = p_user_id
        AND 1 - (brand_documents.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    $$;
  `).execute();
}
