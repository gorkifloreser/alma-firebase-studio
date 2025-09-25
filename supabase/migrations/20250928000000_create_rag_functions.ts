
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // First, ensure the pgvector extension is enabled in the public schema.
  // Using "CREATE EXTENSION IF NOT EXISTS" is safe and idempotent.
  await db.schema.raw('CREATE EXTENSION IF NOT EXISTS vector;').execute();

  // Next, create the function that will be used for the RAG query.
  // This function finds document chunks similar to a user's query.
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

export async function down(db: Kysely<any>): Promise<void> {
  // This function will run if you need to roll back the migration.
  // It removes the function we created.
  await db.schema.raw('DROP FUNCTION IF EXISTS match_brand_documents;').execute();
  
  // Note: We are not dropping the vector extension itself on rollback,
  // as other parts of the system might depend on it.
}
