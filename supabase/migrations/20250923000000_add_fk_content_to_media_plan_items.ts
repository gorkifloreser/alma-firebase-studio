
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Adds a foreign key constraint to the media_plan_item_id column
  // in the 'content' table, making it reference the 'id' from 'media_plan_items'.
  // This ensures that every piece of content can be traced back to its strategic origin.
  // The onDelete('set null') clause means if a media plan item is deleted,
  // the corresponding content will not be deleted, but its link will be severed.
  await db.schema
    .alterTable('content')
    .addForeignKeyConstraint(
      'content_media_plan_item_id_fkey',
      ['media_plan_item_id'],
      'media_plan_items',
      ['id']
    )
    .onDelete('set null')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This function reverts the change by dropping the foreign key constraint.
  await db.schema
    .alterTable('content')
    .dropConstraint('content_media_plan_item_id_fkey')
    .execute();
}
