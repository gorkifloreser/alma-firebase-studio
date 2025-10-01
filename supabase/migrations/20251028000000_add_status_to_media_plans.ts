import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add the new status column to the media_plans table
  await db.schema
    .alterTable('media_plans')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .execute();

  // Add a comment for clarity in the database schema
  await db.schema.raw(`
    COMMENT ON COLUMN public.media_plans.status IS 'The current status of the media plan, e.g., active, archived.';
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will drop the status column if you need to revert the migration.
  await db.schema
    .alterTable('media_plans')
    .dropColumn('status')
    .execute();
}
