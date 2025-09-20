
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add media_plan_item_id to content_generation_queue
  await db.schema
    .alterTable('content_generation_queue')
    .addColumn('media_plan_item_id', 'uuid', (col) =>
      col.references('media_plan_items.id').onDelete('cascade')
    )
    .execute();

  // Step 2: (Optional) Backfill the new column if there is existing data
  // This step is complex as it requires parsing the JSONB.
  // For this migration, we'll assume we can start fresh or handle it manually.
  // Example of what it might look like (might need adjustment):
  // await sql`UPDATE content_generation_queue SET media_plan_item_id = (source_plan_item->>'id')::uuid`.execute(db);

  // Step 3: Drop the old source_plan_item column
  await db.schema
    .alterTable('content_generation_queue')
    .dropColumn('source_plan_item')
    .execute();
    
  // Step 4: Add a NOT NULL constraint if desired, after backfilling
  await db.schema
    .alterTable('content_generation_queue')
    .alterColumn('media_plan_item_id', (col) => col.setNotNull())
    .execute();

  // Step 5: Add a unique constraint to prevent duplicate queue items
  await db.schema
    .alterTable('content_generation_queue')
    .addUniqueConstraint('content_generation_queue_user_id_media_plan_item_id_key', ['user_id', 'media_plan_item_id'])
    .execute();

  // Step 6: Drop the plan_items column from media_plans
  await db.schema
    .alterTable('media_plans')
    .dropColumn('plan_items')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-add plan_items to media_plans
  await db.schema
    .alterTable('media_plans')
    .addColumn('plan_items', 'jsonb')
    .execute();

  // Remove unique constraint from queue
  await db.schema
    .alterTable('content_generation_queue')
    .dropConstraint('content_generation_queue_user_id_media_plan_item_id_key')
    .execute();

  // Re-add source_plan_item to queue
  await db.schema
    .alterTable('content_generation_queue')
    .addColumn('source_plan_item', 'jsonb')
    .execute();

  // (Optional) Manually write a query to back-fill source_plan_item from the foreign key if needed.

  // Drop foreign key and column from queue
  await db.schema
    .alterTable('content_generation_queue')
    .dropConstraint('content_generation_queue_media_plan_item_id_fkey')
    .execute();

  await db.schema
    .alterTable('content_generation_queue')
    .dropColumn('media_plan_item_id')
    .execute();
}
