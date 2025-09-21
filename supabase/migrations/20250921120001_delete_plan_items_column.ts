
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // This SQL command permanently deletes the plan_items column from the media_plans table.
  await db.schema
    .alterTable('media_plans')
    .dropColumn('plan_items')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This SQL command re-adds the plan_items column if you need to revert the migration.
  await db.schema
    .alterTable('media_plans')
    .addColumn('plan_items', 'jsonb')
    .execute();
}
