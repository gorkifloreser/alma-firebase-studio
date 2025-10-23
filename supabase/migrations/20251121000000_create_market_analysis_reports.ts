
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the table to store market analysis reports
  await db.schema
    .createTable('market_analysis_reports')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade').notNull())
    .addColumn('created_at', 'timestamp with time zone', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('report_data', 'jsonb', (col) => col.notNull())
    .execute();

  // Add an index on user_id for faster queries
  await db.schema
    .createIndex('market_analysis_reports_user_id_idx')
    .on('market_analysis_reports')
    .column('user_id')
    .execute();
    
  // Enable Row Level Security
  await db.schema.alterTable('market_analysis_reports').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Create RLS policies
  await db.schema.createPolicy('Allow full access to own reports')
    .for('market_analysis_reports')
    .on('all')
    .to('authenticated')
    .using('auth.uid() = user_id')
    .withCheck('auth.uid() = user_id')
    .execute();
    
  // Add a comment for clarity
  await db.schema.raw(`
    COMMENT ON TABLE public.market_analysis_reports IS 'Stores AI-generated market analysis reports for users.';
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('market_analysis_reports').execute();
}