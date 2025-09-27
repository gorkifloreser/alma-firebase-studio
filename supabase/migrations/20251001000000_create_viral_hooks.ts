
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
      { category: 'Curiosity', text: 'Watch what happens when I try this for the first time…' },
      { category: 'Curiosity', text: 'What if you could [achieve result] without [pain point]?' },
      { category: 'Curiosity', text: 'Most people don’t know this secret about [topic]…' },
      { category: 'Curiosity', text: 'Here’s what I learned after 30 days of doing [X].' },
      { category: 'Curiosity', text: 'The results were not what I expected…' },
      { category: 'Curiosity', text: 'Everyone’s doing this wrong—here’s how to fix it.' },
      { category: 'Curiosity', text: 'Wait—why does nobody teach this?' },
      { category: 'Curiosity', text: 'I ran this experiment so you don’t have to.' },
      { category: 'Value', text: 'Here’s how to do [X] in under 10 minutes.' },
      { category: 'Value', text: 'Save this if you want to [achieve outcome].' },
      { category: 'Value', text: 'Don’t scroll—this will change how you [task].' },
      { category: 'Value', text: 'This tool saved me hours every week.' },
      { category: 'Value', text: 'The one tip that made everything click…' },
      { category: 'Value', text: 'Steal my exact process for [outcome]…' },
      { category: 'Value', text: 'These 3 things boosted my [result] instantly.' },
      { category: 'Value', text: 'This shortcut is too good to gatekeep.' },
      { category: 'Value', text: 'How to go viral using just your phone.' },
      { category: 'Value', text: 'Here’s a checklist I wish I had when I started.' },
      { category: 'Shock', text: 'I was today years old when I learned this.' },
      { category: 'Shock', text: 'This shouldn\'t have worked… but it did.' },
      { category: 'Shock', text: 'I made this one mistake and it cost me $5,000.' },
      { category: 'Shock', text: 'No one warned me about this.' },
      { category: 'Shock', text: 'This trend got me banned—here’s why.' },
      { category: 'Shock', text: 'This is going to sound insane, but hear me out…' },
      { category: 'Shock', text: 'I can’t believe I’m posting this…' },
      { category: 'Shock', text: 'This might be controversial, but…' },
      { category: 'Shock', text: 'It’s wild how easy this is (once you know the trick).' },
      { category: 'Shock', text: 'Every expert I follow got this wrong.' },
      { category: 'Relatibility', text: 'Tell me you’re a [blank] without telling me…' },
      { category: 'Relatibility', text: 'POV: You just opened your laptop and instantly forgot why.' },
      { category: 'Relatibility', text: 'If you’ve ever said ‘I’ll start tomorrow,’ this is for you.' },
      { category: 'Relatibility', text: 'This is your sign to stop overthinking it.' },
      { category: 'Relatibility', text: 'Raise your hand if this has happened to you 🙋‍♀️' },
      { category: 'Relatibility', text: 'If this is you, you’re not alone.' },
      { category: 'Relatibility', text: 'You’re not the only one who [common struggle].' },
      { category: 'Relatibility', text: 'Let’s be real—nobody talks about this part.' },
      { category: 'Relatibility', text: 'When you pretend everything’s fine but your calendar says otherwise.' },
      { category: 'Relatibility', text: 'The ‘I can fix it’ phase… yeah, we’ve all been there.' },
      { category: 'FOMO', text: 'If you’re not doing this in 2025, you’re already behind.' },
      { category: 'FOMO', text: 'You have 48 hours to jump on this trend.' },
      { category: 'FOMO', text: 'This trend is peaking—don’t miss it.' },
      { category: 'FOMO', text: 'Here’s what everyone will be doing next month.' },
      { category: 'FOMO', text: 'Mark my words, this is about to blow up.' },
      { category: 'FOMO', text: 'Every creator is talking about this—are you?' },
      { category: 'FOMO', text: 'The clock is ticking—this only works right now.' },
      { category: 'FOMO', text: 'Your competitors already know this—do you?' },
      { category: 'FOMO', text: 'This strategy won’t work in 6 months.' },
      { category: 'FOMO', text: 'This is your chance to get in before it’s saturated.' },
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
