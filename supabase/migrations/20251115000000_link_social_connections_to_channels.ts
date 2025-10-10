
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add the new user_channel_setting_id column to social_connections
  // This column will store the link to the user_channel_settings table.
  await db.schema
    .alterTable('social_connections')
    .addColumn('user_channel_setting_id', 'bigint')
    .execute();

  // Step 2: Add the foreign key constraint to create the relationship.
  // onDelete('cascade') means if a user deletes a channel setting,
  // the corresponding social connection will also be deleted.
  await db.schema
    .alterTable('social_connections')
    .addForeignKeyConstraint(
      'social_connections_user_channel_setting_id_fkey',
      ['user_channel_setting_id'],
      'user_channel_settings',
      ['id']
    )
    .onDelete('cascade')
    .execute();
  
  // Step 3: Add a comment for clarity in the database schema.
  await db.schema.raw(`
    COMMENT ON COLUMN public.social_connections.user_channel_setting_id IS 'Links the social connection to a specific user-configured channel setting.';
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // To revert the changes, we drop the constraint and then the column.
  
  // Step 1: Drop the foreign key constraint
  await db.schema
    .alterTable('social_connections')
    .dropConstraint('social_connections_user_channel_setting_id_fkey')
    .execute();

  // Step 2: Drop the user_channel_setting_id column
  await db.schema
    .alterTable('social_connections')
    .dropColumn('user_channel_setting_id')
    .execute();
}
