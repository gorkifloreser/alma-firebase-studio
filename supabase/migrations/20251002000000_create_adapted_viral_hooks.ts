
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('adapted_viral_hooks')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('original_id', 'bigint', (col) => col.references('viral_hooks.id').onDelete('set null'))
    .addColumn('original_text', 'text')
    .addColumn('category', 'text')
    .addColumn('relevance_score', 'integer')
    .addColumn('virality_score', 'integer')
    .addColumn('adapted_hook', 'text')
    .addColumn('strategy', 'text')
    .addColumn('visual_prompt', 'text')
    .addColumn('created_at', 'timestamp with time zone', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

  // Enable RLS
  await db.schema.alterTable('adapted_viral_hooks').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Policies
  // 1. Allow users to read their own adapted hooks
  await db.schema.createPolicy('Allow read access to own adapted hooks')
      .for('adapted_viral_hooks').on('SELECT').to('authenticated')
      .using('auth.uid() = user_id').execute();
  
  // 2. Allow users to create hooks for themselves
  await db.schema.createPolicy('Allow insert for own adapted hooks')
      .for('adapted_viral_hooks').on('INSERT').to('authenticated')
      .withCheck('auth.uid() = user_id').execute();

  // 3. Allow users to update their own adapted hooks
  await db.schema.createPolicy('Allow update for own adapted hooks')
      .for('adapted_viral_hooks').on('UPDATE').to('authenticated')
      .using('auth.uid() = user_id').execute();

  // 4. Allow users to delete their own adapted hooks
  await db.schema.createPolicy('Allow delete for own adapted hooks')
      .for('adapted_viral_hooks').on('DELETE').to('authenticated')
      .using('auth.uid() = user_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('adapted_viral_hooks').execute();
}
