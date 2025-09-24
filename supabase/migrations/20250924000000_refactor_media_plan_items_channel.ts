import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add the new user_channel_id column to media_plan_items
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('user_channel_id', 'bigint')
    .execute();

  // Step 2: (Optional but recommended) Backfill the user_channel_id based on the old channel name.
  // This query joins media_plan_items with user_channel_settings to find the correct ID.
  await db.executeQuery(
    `
    UPDATE media_plan_items
    SET user_channel_id = ucs.id
    FROM user_channel_settings ucs
    WHERE media_plan_items.user_id = ucs.user_id
      AND media_plan_items.channel = ucs.channel_name;
    `.trim()
  );

  // Step 3: Add the foreign key constraint
  await db.schema
    .alterTable('media_plan_items')
    .addForeignKeyConstraint(
      'media_plan_items_user_channel_id_fkey',
      ['user_channel_id'],
      'user_channel_settings',
      ['id']
    )
    .onDelete('set null') // If a channel is deleted, nullify the link but keep the plan item
    .execute();
    
  // Step 4: Drop the old, redundant 'channel' text column
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('channel')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-add the old 'channel' text column
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('channel', 'text')
    .execute();

  // (Optional) Backfill the 'channel' column from the foreign key relationship
  await db.executeQuery(
    `
    UPDATE media_plan_items
    SET channel = ucs.channel_name
    FROM user_channel_settings ucs
    WHERE media_plan_items.user_channel_id = ucs.id;
    `.trim()
  );

  // Drop the foreign key constraint
  await db.schema
    .alterTable('media_plan_items')
    .dropConstraint('media_plan_items_user_channel_id_fkey')
    .execute();

  // Drop the 'user_channel_id' column
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('user_channel_id')
    .execute();
}
