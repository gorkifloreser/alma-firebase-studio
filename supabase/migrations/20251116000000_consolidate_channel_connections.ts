
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

  // Step 2: Add connection-related columns to user_channel_settings
  await db.schema
    .alterTable('user_channel_settings')
    .addColumn('provider', 'text')
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('expires_at', 'timestamp with time zone')
    .addColumn('account_id', 'text')
    .addColumn('account_name', 'text')
    .addColumn('account_picture_url', 'text')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('instagram_account_id', 'text')
    .execute();

  // Step 3: (Optional but recommended) Backfill data from social_connections to user_channel_settings
  // This is a conceptual step. The actual SQL would be complex and depends on existing data.
  // For example:
  // UPDATE user_channel_settings ucs SET ... FROM social_connections sc WHERE ucs.user_id = sc.user_id AND ucs.channel_name = sc.provider;

  // Step 4: Drop the social_connections and user_channels tables
  await db.schema.dropTable('social_connections').ifExists().execute();
  await db.schema.dropTable('user_channels').ifExists().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Recreate user_channels table
  await db.schema
    .createTable('user_channels')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('channel_name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp with time zone', (col) => col.defaultTo('now()').notNull())
    .execute();

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
    .dropColumn('provider')
    .dropColumn('access_token')
    .dropColumn('refresh_token')
    .dropColumn('expires_at')
    .dropColumn('account_id')
    .dropColumn('account_name')
    .dropColumn('account_picture_url')
    .dropColumn('is_active')
    .dropColumn('instagram_account_id')
    .execute();
}

    