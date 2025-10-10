
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add a foreign key from user_channel_settings to user_channels
  await db.schema
    .alterTable('user_channel_settings')
    .addColumn('user_channel_id', 'bigint')
    .execute();
    
  await db.schema
    .alterTable('user_channel_settings')
    .addForeignKeyConstraint(
        'user_channel_settings_user_channel_id_fkey',
        ['user_channel_id'],
        'user_channels',
        ['id']
    )
    .onDelete('cascade')
    .execute();

  // Step 2: Add a JSONB column to user_channel_settings to store an array of connections
  await db.schema
    .alterTable('user_channel_settings')
    .addColumn('connections', 'jsonb', col => col.defaultTo(sql`'[]'::jsonb`))
    .execute();
    
   // Step 3: (Optional but good practice) Add a comment for clarity
    await db.schema.raw(`
        COMMENT ON COLUMN public.user_channel_settings.connections IS 'Stores an array of social media connection objects, e.g., multiple Instagram accounts, each with its own token, ID, and active status.';
    `).execute();


  // Step 4: Drop the now redundant social_connections table
  await db.schema.dropTable('social_connections').ifExists().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Recreate social_connections table
  await db.schema
    .createTable('social_connections')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('provider', 'text', (col) => col.notNull())
    .addColumn('access_token', 'text', (col) => col.notNull())
    .addColumn('refresh_token', 'text')
    .addColumn('expires_at', 'timestamp with time zone')
    .addColumn('account_id', 'text')
    .addColumn('instagram_account_id', 'text')
    .addColumn('account_name', 'text')
    .addColumn('account_picture_url', 'text')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamp with time zone', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Remove columns from user_channel_settings
  await db.schema
    .alterTable('user_channel_settings')
    .dropConstraint('user_channel_settings_user_channel_id_fkey')
    .execute();
    
  await db.schema
    .alterTable('user_channel_settings')
    .dropColumn('user_channel_id')
    .dropColumn('connections')
    .execute();
}
