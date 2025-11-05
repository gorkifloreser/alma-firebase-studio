
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('web_pages')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('title', 'text')
    .addColumn('puck_data', 'jsonb')
    .addColumn('created_at', 'timestamp with time zone', (col) => col.defaultTo('now()').notNull())
    .addColumn('updated_at', 'timestamp with time zone', (col) => col.defaultTo('now()').notNull())
    .addUniqueConstraint('web_pages_user_id_slug_key', ['user_id', 'slug'])
    .execute();

  // Enable RLS
  await db.schema.alterTable('web_pages').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Policies
  // Allow public read access
  await db.schema.createPolicy('Allow public read access to web pages')
    .for('web_pages').on('SELECT').to('anon, authenticated')
    .using('true').execute();
  
  // Allow users to manage their own pages
  await db.schema.createPolicy('Allow users to manage their own web pages')
    .for('web_pages').on('all').to('authenticated')
    .using('auth.uid() = user_id')
    .withCheck('auth.uid() = user_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('web_pages').execute();
}
