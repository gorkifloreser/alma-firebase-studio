
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add the new visual_identity column to the brand_hearts table
  // It's a JSONB column to hold bilingual text, similar to other fields.
  await db.schema
    .alterTable('brand_hearts')
    .addColumn('visual_identity', 'jsonb', (col) => col.defaultTo('{}'::any))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // This will drop the visual_identity column if you need to revert.
  await db.schema
    .alterTable('brand_hearts')
    .dropColumn('visual_identity')
    .execute();
}
