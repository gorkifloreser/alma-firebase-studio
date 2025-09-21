
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add a unique constraint on the combination of user_id and media_plan_item_id
  // This is necessary for the ON CONFLICT (upsert) operation to work correctly.
  await db.schema
    .alterTable('content_generation_queue')
    .addUniqueConstraint(
      'content_generation_queue_user_id_media_plan_item_id_key',
      ['user_id', 'media_plan_item_id']
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the unique constraint if you need to revert the migration.
  await db.schema
    .alterTable('content_generation_queue')
    .dropConstraint('content_generation_queue_user_id_media_plan_item_id_key')
    .execute();
}
