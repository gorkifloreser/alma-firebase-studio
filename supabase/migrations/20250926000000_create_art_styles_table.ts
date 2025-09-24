import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('art_styles')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo('gen_random_uuid()'))
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('prompt_suffix', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo('now()').notNull())
    .execute();

  // Add some default styles that are available to all users (user_id is NULL)
  await db
    .insertInto('art_styles')
    .values([
      { name: 'Vintage Film', prompt_suffix: ', vintage film photography, grainy texture, muted colors, 1970s aesthetic, cinematic lighting' },
      { name: 'Oil Painting', prompt_suffix: ', masterpiece oil painting, visible brush strokes, rich colors, dramatic lighting' },
      { name: 'Pastel Drawing', prompt_suffix: ', gentle pastel drawing, soft focus, chalky texture, dreamy atmosphere, light colors' },
      { name: 'Art Nouveau', prompt_suffix: ', Art Nouveau style, intricate organic lines, flowing curves, decorative patterns, Alphonse Mucha inspired' },
      { name: '3D Render', prompt_suffix: ', 3D digital render, octane render, photorealistic, soft global illumination, modern design' },
      { name: 'Minimalist Line Art', prompt_suffix: ', minimalist single line drawing, clean and simple, black on a white background, elegant' },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('art_styles').execute();
}
