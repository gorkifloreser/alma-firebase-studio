
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {

  // Step 1: Add a 'prices' JSONB column to offering_schedules
  // This column will store an array of price objects.
  await db.schema
    .alterTable('offering_schedules')
    .addColumn('prices', 'jsonb', (col) => col.defaultTo('[]'::any).notNull())
    .execute();
  
  // Step 2: (Migration logic) Copy existing price data into the new JSONB column
  // This ensures no data is lost from the old single-price structure.
  await db.schema.raw(`
    UPDATE offering_schedules
    SET prices = (
      CASE
        WHEN price IS NOT NULL THEN
          jsonb_build_array(
            jsonb_build_object(
              'id', gen_random_uuid(),
              'label', price_label,
              'price', price,
              'currency', currency
            )
          )
        ELSE
          '[]'::jsonb
      END
    );
  `).execute();

  // Step 3: Drop the old, now redundant, single-price columns
  await db.schema
    .alterTable('offering_schedules')
    .dropColumn('price')
    .dropColumn('price_label')
    .dropColumn('currency')
    .execute();

  // Step 4: Drop the old 'price' and 'currency' columns from the main 'offerings' table
  // This was part of a previous migration but we ensure it's gone.
  await db.schema
    .alterTable('offerings')
    .dropColumn('price', { ifExists: true })
    .dropColumn('currency', { ifExists: true })
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // To revert, we'll re-add the old columns
  await db.schema
    .alterTable('offering_schedules')
    .addColumn('price', 'numeric')
    .addColumn('price_label', 'text')
    .addColumn('currency', 'text')
    .execute();

  // (Optional) A more complex script could try to extract the first price
  // from the JSONB array back into the flat columns. For simplicity, this is omitted.
  // Example:
  // UPDATE offering_schedules SET price = (prices->0->>'price')::numeric, ...

  // Drop the new 'prices' JSONB column
  await db.schema
    .alterTable('offering_schedules')
    .dropColumn('prices')
    .execute();
}
