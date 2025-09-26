
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('viral_hooks')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('auth.users.id').onDelete('cascade'))
    .addColumn('category', 'text', (col) => col.notNull())
    .addColumn('hook_text', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp with time zone', (col) =>
      col.defaultTo('now()').notNull()
    )
    .execute();

  // Seed with initial global hooks
  const initialHooks = [
      { category: 'Curiosity', text: 'You’re doing this completely wrong…' },
      { category: 'Curiosity', text: 'Nobody talks about this, but it changes everything.' },
      { category: 'Value', text: 'Here’s how to do [X] in under 10 minutes.' },
      { category: 'Value', text: 'Save this if you want to [achieve outcome].' },
      { category: 'Shock', text: 'I was today years old when I learned this.' },
      { category: 'Shock', text: 'This shouldn’t have worked… but it did.' },
      { category: 'Relatability', text: 'Tell me you’re a [blank] without telling me…' },
      { category: 'Relatability', text: 'If you’ve ever said ‘I’ll start tomorrow,’ this is for you.' },
      { category: 'FOMO', text: 'If you’re not doing this in 2025, you’re already behind.' },
      { category: 'FOMO', text: 'This trend is peaking—don’t miss it.' },
  ];

  await db.insertInto('viral_hooks').values(initialHooks.map(h => ({ category: h.category, hook_text: h.text }))).execute();


  // Enable RLS
  await db.schema.alterTable('viral_hooks').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Policies
  // 1. Allow users to read all global hooks (user_id IS NULL)
  await db.schema.createPolicy('Allow read access to global hooks')
      .for('viral_hooks').on('SELECT').to('authenticated')
      .using('user_id IS NULL').execute();

  // 2. Allow users to read their own custom hooks
  await db.schema.createPolicy('Allow read access to own hooks')
      .for('viral_hooks').on('SELECT').to('authenticated')
      .using('auth.uid() = user_id').execute();
  
  // 3. Allow users to create hooks for themselves
  await db.schema.createPolicy('Allow insert for own hooks')
      .for('viral_hooks').on('INSERT').to('authenticated')
      .withCheck('auth.uid() = user_id').execute();

  // 4. Allow users to update their own hooks
  await db.schema.createPolicy('Allow update for own hooks')
      .for('viral_hooks').on('UPDATE').to('authenticated')
      .using('auth.uid() = user_id').execute();

  // 5. Allow users to delete their own hooks
  await db.schema.createPolicy('Allow delete for own hooks')
      .for('viral_hooks').on('DELETE').to('authenticated')
      .using('auth.uid() = user_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('viral_hooks').execute();
}
