
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add a status column to the media_plan_items table
  // with a default value of 'draft'.
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the status column from the media_plan_items table
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('status')
    .execute();
}
