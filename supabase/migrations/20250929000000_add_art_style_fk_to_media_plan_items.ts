
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add the art_style_id column to the media_plan_items table
  await db.schema
    .alterTable('media_plan_items')
    .addColumn('art_style_id', 'uuid', (col) =>
      col.references('art_styles.id').onDelete('set null')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // In case of rollback, drop the foreign key constraint and the column
  await db.schema
    .alterTable('media_plan_items')
    .dropConstraint('media_plan_items_art_style_id_fkey')
    .ifExists()
    .execute();
    
  await db.schema
    .alterTable('media_plan_items')
    .dropColumn('art_style_id')
    .execute();
}
