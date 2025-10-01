
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add the new 'concept' column
  await db.schema
    .alterTable('offerings')
    .addColumn('concept', 'jsonb', (col) => col.defaultTo(sql`'[]'`))
    .execute();

  // Step 2: Rename the existing 'value_content' column to 'developed_content'
  await db.schema
    .alterTable('offerings')
    .renameColumn('value_content', 'developed_content')
    .execute();
    
   // Step 3: (Optional but good practice) Update comments on the columns
  await db.schema.raw(`
    COMMENT ON COLUMN public.offerings.concept IS 'Stores an array of high-level concepts or ideas for value content.';
  `).execute();
  await db.schema.raw(`
    COMMENT ON COLUMN public.offerings.developed_content IS 'Stores an array of fully developed content pieces, expanded from the concepts.';
  `).execute();

}

export async function down(db: Kysely<any>): Promise<void> {
  // Revert the changes in reverse order

  // Step 1: Rename 'developed_content' back to 'value_content'
  await db.schema
    .alterTable('offerings')
    .renameColumn('developed_content', 'value_content')
    .execute();

  // Step 2: Drop the 'concept' column
  await db.schema
    .alterTable('offerings')
    .dropColumn('concept')
    .execute();

   // Step 3: Remove comments
   await db.schema.raw(`COMMENT ON COLUMN public.offerings.value_content IS NULL;`).execute();
}
