
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Step 1: Add the new 'connections' column of type JSONB.
  // It will store an array of connection objects.
  await db.schema
    .alterTable('user_channel_settings')
    .addColumn('connections', 'jsonb', (col) => col.defaultTo(sql`'[]'::jsonb`))
    .execute();
    
  // Step 2: Add a comment for clarity in the database schema.
  await db.schema.raw(`
    COMMENT ON COLUMN public.user_channel_settings.connections IS 'Stores an array of social media connection objects, e.g., multiple Instagram accounts, each with its own token, ID, and active status.';
  `).execute();
  
  // Step 3: Drop the old, now redundant columns from the previous refactor attempt.
  // This cleans up the table to align with the new JSONB strategy.
  await db.schema
    .alterTable('user_channel_settings')
    .dropColumn('provider', { ifExists: true })
    .dropColumn('access_token', { ifExists: true })
    .dropColumn('refresh_token', { ifExists: true })
    .dropColumn('expires_at', { ifExists: true })
    .dropColumn('account_id', { ifExists: true })
    .dropColumn('instagram_account_id', { ifExists: true })
    .dropColumn('account_name', { ifExists: true })
    .dropColumn('is_active', { ifExists: true })
    .dropColumn('account_picture_url', { ifExists: true })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will drop the new 'connections' column if you need to revert.
  await db.schema
    .alterTable('user_channel_settings')
    .dropColumn('connections')
    .execute();
    
  // Re-add the old columns if reverting.
  await db.schema
    .alterTable('user_channel_settings')
    .addColumn('provider', 'text')
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('expires_at', 'timestamp with time zone')
    .addColumn('account_id', 'text')
    .addColumn('instagram_account_id', 'text')
    .addColumn('account_name', 'text')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('account_picture_url', 'text')
    .execute();
}
