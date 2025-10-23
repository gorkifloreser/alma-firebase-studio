import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the market_analysis table
  await db.schema
    .createTable('market_analysis')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.references('auth.users.id').onDelete('cascade').notNull().unique()
    )
    .addColumn('indice_demanda_mensual', 'integer', (col) => col.notNull().defaultTo(50))
    .addColumn('indice_oferta_competencia', 'integer', (col) => col.notNull().defaultTo(50))
    .addColumn('tendencia_precios_promedio', 'float8', (col) => col.notNull().defaultTo(0))
    .addColumn('margen_ganancia_actual', 'integer', (col) => col.notNull().defaultTo(25))
    .addColumn('created_at', 'timestamp with time zone', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('updated_at', 'timestamp with time zone', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Enable RLS
  await db.schema.alterTable('market_analysis').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Create RLS policies
  await db.schema
    .createPolicy('Allow individual read access on market_analysis')
    .for('market_analysis')
    .on('SELECT')
    .to('authenticated')
    .using('auth.uid() = user_id')
    .execute();

  await db.schema
    .createPolicy('Allow individual insert access on market_analysis')
    .for('market_analysis')
    .on('INSERT')
    .to('authenticated')
    .withCheck('auth.uid() = user_id')
    .execute();

  await db.schema
    .createPolicy('Allow individual update access on market_analysis')
    .for('market_analysis')
    .on('UPDATE')
    .to('authenticated')
    .using('auth.uid() = user_id')
    .withCheck('auth.uid() = user_id')
    .execute();
    
  await db.schema
    .createPolicy('Allow individual delete access on market_analysis')
    .for('market_analysis')
    .on('DELETE')
    .to('authenticated')
    .using('auth.uid() = user_id')
    .execute();

  // Create a trigger to automatically update the 'updated_at' timestamp
  await db.schema.raw(`
    CREATE OR REPLACE FUNCTION public.handle_market_analysis_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `).execute();

  await db.schema.raw(`
    CREATE TRIGGER on_market_analysis_update
    BEFORE UPDATE ON public.market_analysis
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_market_analysis_updated_at();
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('market_analysis').execute();
  await db.schema.raw(`DROP FUNCTION IF EXISTS public.handle_market_analysis_updated_at();`).execute();
}
