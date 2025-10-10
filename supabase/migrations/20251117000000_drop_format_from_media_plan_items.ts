
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // This SQL command permanently deletes the 'format' column from the 'media_plan_items' table.
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('format')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This SQL command re-adds the 'format' column if you need to revert the migration.
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('format', 'text')
    .execute();
}
