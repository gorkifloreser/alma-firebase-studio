
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add the new value_content column to the offerings table
  // It's a JSONB column to hold an array of content blocks.
  await db.schema
    .alterTable('offerings')
    .addColumn('value_content', 'jsonb', (col) => col.defaultTo(sql`'[]'`))
    .execute();

  // Add a comment for clarity in the database schema
  await db.schema.raw(`
    COMMENT ON COLUMN public.offerings.value_content IS 'Stores an array of structured content blocks (e.g., key benefits, customer stories) to provide richer context for AI generation.';
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will drop the value_content column if you need to revert the migration.
  await db.schema
    .alterTable('offerings')
    .dropColumn('value_content')
    .execute();
}

  