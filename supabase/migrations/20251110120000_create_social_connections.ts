
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('social_connections')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('provider', 'text', (col) => col.notNull())
    .addColumn('access_token', 'text', (col) => col.notNull()) // Should be encrypted
    .addColumn('refresh_token', 'text') // Should be encrypted
    .addColumn('expires_at', 'timestamp with time zone')
    .addColumn('account_id', 'text') // Facebook Page ID, etc.
    .addColumn('instagram_account_id', 'text') // Specific for Meta connections
    .addColumn('account_name', 'text')
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(false).notNull())
    .addColumn('created_at', 'timestamp with time zone', (col) => col.defaultTo('now()').notNull())
    .addUniqueConstraint('social_connections_user_id_account_id_provider_key', ['user_id', 'account_id', 'provider'])
    .execute();

  // Partial unique index to ensure only one connection can be active per user per provider
  await db.schema.raw(
      `CREATE UNIQUE INDEX one_active_connection_per_provider ON social_connections (user_id, provider) WHERE (is_active = true);`
  ).execute();

  // Enable RLS
  await db.schema.alterTable('social_connections').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Policies
  await db.schema.createPolicy('Allow full access to own social connections')
    .for('social_connections')
    .on('all')
    .to('authenticated')
    .using('auth.uid() = user_id')
    .withCheck('auth.uid() = user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('social_connections').execute();
}
