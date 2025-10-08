
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // This command adds the new 'Value Content' option to the existing
  // 'offering_type' enum in the database.
  await db.schema.raw("ALTER TYPE public.offering_type ADD VALUE 'Value Content'").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Reverting this change is complex as it involves removing a value from an enum,
  // which can fail if the value is in use. A manual process is typically required.
  // For the purpose of this migration, we will log a warning.
  console.warn("Reverting an ADD VALUE on an enum is a destructive operation and is not automatically supported. Please handle manually if needed.");
}
