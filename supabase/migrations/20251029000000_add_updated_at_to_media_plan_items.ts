
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // This adds the 'updated_at' column to the 'media_plan_items' table.
  // It's a timestamp that will automatically update to the current time
  // whenever a row is modified, which is crucial for tracking changes.
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('updated_at', 'timestamp with time zone', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // This creates a trigger function that will be called before any update
  // on the media_plan_items table.
  await db.schema.raw(`
    CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
    RETURNS TRIGGER AS $$
    DECLARE
      _new record;
    BEGIN
      _new := NEW;
      _new."updated_at" = NOW();
      RETURN _new;
    END;
    $$ LANGUAGE plpgsql;
  `).execute();

  // This attaches the trigger to the table. Now, any UPDATE statement
  // will automatically run the function and set the updated_at column.
  await db.schema.raw(`
    CREATE TRIGGER set_media_plan_items_updated_at
    BEFORE UPDATE ON public.media_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will revert the changes if the migration needs to be undone.
  await db.schema.raw('DROP TRIGGER IF EXISTS set_media_plan_items_updated_at ON public.media_plan_items;').execute();
  await db.schema.raw('DROP FUNCTION IF EXISTS public.set_current_timestamp_updated_at();').execute();
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('updated_at')
    .execute();
}
