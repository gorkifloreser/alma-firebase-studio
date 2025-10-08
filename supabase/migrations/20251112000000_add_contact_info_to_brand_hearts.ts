
import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add the new contact_info column to the brand_hearts table
  // It's a JSONB column to hold an array of contact objects.
  await db.schema
    .alterTable('brand_hearts')
    .addColumn('contact_info', 'jsonb', (col) => col.defaultTo(sql`'[]'::jsonb`))
    .execute();

  await db.schema.raw(`
    COMMENT ON COLUMN public.brand_hearts.contact_info IS 'Stores an array of contact points like email, phone, or review links.';
  `).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will drop the contact_info column if you need to revert.
  await db.schema
    .alterTable('brand_hearts')
    .dropColumn('contact_info')
    .execute();
}
