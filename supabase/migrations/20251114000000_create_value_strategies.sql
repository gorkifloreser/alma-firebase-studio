
import { type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('value_strategies')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('virality_axis', 'text')
    .addColumn('content_method', 'text')
    .addColumn('value_purpose', 'text')
    .addColumn('practical_example', 'text')
    .execute();

  const strategies = [
    { virality_axis: 'EMOTION (Humor)', content_method: 'Meme with Contextual Commentary', value_purpose: 'Immediate identification with a common niche pain point.', practical_example: 'Meme of a dog with coffee, with text: "Me, at 3 a.m., waiting for the algorithm to give me organic reach."' },
    { virality_axis: 'EMOTION (Surprise)', content_method: '7-Second "Plot Twist"', value_purpose: 'Break expectations with an unexpected twist that encourages re-watching.', practical_example: 'You show a complex cooking process and end up using a fast-food product.' },
    { virality_axis: 'EMOTION (Authenticity)', content_method: 'Sincere "Behind-the-Scenes" Video', value_purpose: 'Humanize the brand by showing mistakes or the real, fun side of work.', practical_example: 'The fail or blooper of the CEO trying to record a serious tutorial.' },
    { virality_axis: 'EMOTION (Curiosity/Outrage)', content_method: 'Relevant Social Experiment', value_purpose: 'Generate debate and reflection on a social or consumer issue.', practical_example: 'Interviewing people on the street about a basic financial myth.' },
    { virality_axis: 'EMOTION (Inspiration)', content_method: 'Overcoming Storytelling (Carousel)', value_purpose: 'Connect emotionally by narrating failure and subsequent success.', practical_example: '"How a $10,000 mistake taught me this key business lesson."' },
    { virality_axis: 'EMOTION (Controversy)', content_method: 'Radical Critique of a Trend', value_purpose: 'Challenge an established "rule" in the industry to generate debate.', practical_example: 'Video: "Why \'Work Hard\' is the worst productivity advice ever."' },
    { virality_axis: 'EMOTION (Identification)', content_method: 'Quick Interview with "Common People"', value_purpose: 'Show that user experiences are universal and relatable.', practical_example: '"What\'s your worst online shopping experience during Black Friday?"' },
    { virality_axis: 'EMOTION (Hope)', content_method: '"Act of Kindness" Campaign', value_purpose: 'Inspire the audience by showing the brand genuinely helping.', practical_example: 'Paying the bill for a customer who is just starting their own business.' },
    { virality_axis: 'EMOTION (Humor)', content_method: 'Using a Viral Audio Out of Context', value_purpose: 'Adapt a popular song or sound to an awkward daily work situation.', practical_example: 'Reel using a viral audio about a common frustration with a client\'s email.' },
    { virality_axis: 'EMOTION (Fun)', content_method: 'Challenge with a Reward', value_purpose: 'Invite mass action by asking people to imitate a simple and useful challenge.', practical_example: '"The #OrganizationChallenge: 3 steps to clean your desk in 60 seconds."' },
    { virality_axis: 'UTILITY (Immediacy)', content_method: '"Stop-Motion" Mini-Tutorial', value_purpose: 'Teach a complete process in minimal time, ideal for saving.', practical_example: 'A silent video showing how to assemble furniture or fix a software bug in 15 seconds.' },
    { virality_axis: 'UTILITY (Resource)', content_method: 'Definitive PDF Guide (No Lead Gen)', value_purpose: 'Offer a high-value resource without barriers (no email required) to maximize sharing.', practical_example: 'A downloadable "100-Point Checklist Before Launching Your Website."' },
    { virality_axis: 'UTILITY (Time-Saving)', content_method: 'Cheat Sheet', value_purpose: 'Provide an image or carousel with essential shortcuts or commands.', practical_example: 'Infographic with all the keyboard shortcuts for Photoshop or Excel.' },
    { virality_axis: 'UTILITY (Clarity)', content_method: 'Complex Process Infographic', value_purpose: 'Simplify a difficult workflow into a digestible visual.', practical_example: 'A flowchart explaining the 10 stages of real estate investment.' },
    { virality_axis: 'UTILITY (Basic Education)', content_method: 'Niche Dictionary for Beginners', value_purpose: 'Clarify technical terms that confuse a new audience.', practical_example: 'Carousel explaining 5 digital marketing terms people often use incorrectly.' },
    { virality_axis: 'UTILITY (Decision)', content_method: '"This vs. That" Post (Comparison)', value_purpose: 'Help the user make a purchasing decision with an impartial analysis.', practical_example: 'Article or reel comparing iPhone vs. Android for photographers.' },
    { virality_axis: 'UTILITY (Tool)', content_method: 'Free Editable Template', value_purpose: 'Offer a ready-to-use tool that saves hours of work.', practical_example: 'An editable Google Sheets file to create a monthly budget.' },
    { virality_axis: 'UTILITY (Critical Knowledge)', content_method: 'Debunking a Popular Product Flaw', value_purpose: 'Provide information the manufacturer doesn\'t, building trust.', practical_example: 'Video analyzing why a feature on a famous phone fails and how to disable it.' },
    { virality_axis: 'UTILITY (Evidence)', content_method: 'Open-Metrics Case Study', value_purpose: 'Share real numbers (traffic, ROI, engagement) from a project.', practical_example: 'Post with a screenshot from Google Analytics of a content success.' },
    { virality_axis: 'UTILITY (Advice)', content_method: '"Ask Me Anything" (AMA) Live Session', value_purpose: 'Offer free, personalized advice through a Q&A session.', practical_example: 'A 30-minute live session answering technical questions about programming.' },
    { virality_axis: 'TIMING (Perspective)', content_method: 'Quick News Commentary (Op-Ed)', value_purpose: 'Relate a current event to the principles of your niche.', practical_example: 'Text post giving your professional opinion on the latest interest rate change.' },
    { virality_axis: 'TIMING (Humor)', content_method: 'Parody of a Famous Commercial', value_purpose: 'Leverage the popularity of a current ad campaign.', practical_example: 'Recreating a viral Coca-Cola ad, but replacing the drink with your product.' },
    { virality_axis: 'TIMING (Adaptation)', content_method: 'Using a Trending Music with an Educational Gesture', value_purpose: 'Use a trending audio in a Reel to show data and important tips.', practical_example: 'Reel with a simple dance pointing to 5 industry facts on screen.' },
    { virality_axis: 'TIMING (Summary)', content_method: 'The "Top 5" of the Week/Month', value_purpose: 'Save your audience time by recapping the most important news.', practical_example: 'Carousel with "The 5 most relevant tech news of the week."' },
    { virality_axis: 'TIMING (Game)', content_method: 'Viral Voting Bracket or Poll', value_purpose: 'Create a fun, interactive competition based on current events.', practical_example: 'Pitting the top 8 marketing books of the year against each other in a voting tournament.' },
    { virality_axis: 'TIMING (Sincerity)', content_method: 'Real-Time Reaction Video', value_purpose: 'Show a spontaneous, unfiltered opinion on a launch or event.', practical_example: 'Recording your immediate reaction to a new iPhone or console announcement.' },
    { virality_axis: 'TIMING (Vision)', content_method: 'Predictive Analysis (Forecasting)', value_purpose: 'Share bold predictions about the future of the industry.', practical_example: 'Post with 3 controversial predictions about the future of remote work in 2026.' },
    { virality_axis: 'TIMING (Education)', content_method: '"Behind the Trend" (Trend Analysis)', value_purpose: 'Explain the psychology or reasons behind a viral trend.', practical_example: 'Video breaking down why a TikTok challenge became so popular.' },
    { virality_axis: 'TIMING (Nostalgia)', content_method: 'Annual Recap / End of Year', value_purpose: 'Look back to celebrate successes and the value delivered.', practical_example: 'Carousel of "The 10 most useful hacks we shared this year."' },
    { virality_axis: 'TIMING (Solution)', content_method: 'Direct Answer to a Trending Question', value_purpose: 'Use a popular hashtag to solve a specific doubt.', practical_example: '30-second video using a trend to answer a current tax question.' },
    { virality_axis: 'COMMUNITY (Recognition)', content_method: 'User-Generated Content (UGC)', value_purpose: 'Validate and recognize the creativity of customers and followers.', practical_example: 'Reposting a customer who uses your product in an innovative way.' },
    { virality_axis: 'COMMUNITY (Challenge)', content_method: 'Knowledge Trivia or Quiz', value_purpose: 'Encourage participation and test the audience\'s knowledge.', practical_example: 'Multiple-choice questions in Stories about fun facts in your niche.' },
    { virality_axis: 'COMMUNITY (Reach)', content_method: 'Collaboration with a Micro-Influencer', value_purpose: 'Merge audiences and validate the message with a credible voice in a niche.', practical_example: 'A joint Live session with a small expert on a little-known but useful software.' },
    { virality_axis: 'COMMUNITY (Co-Creation)', content_method: 'Decision Poll or Survey', value_purpose: 'Make the audience feel ownership of the content by deciding the next piece.', practical_example: 'Asking in Stories if they prefer a post about "Finance" or "Productivity" next week.' },
    { virality_axis: 'COMMUNITY (Interaction)', content_method: 'Massive Comment Challenge', value_purpose: 'Incentivize mass response with a promise of exclusive content.', practical_example: '"Comment the word KEYWORD to unlock a free template in my DM."' },
    { virality_axis: 'COMMUNITY (Attention)', content_method: 'Video Reply to a Comment', value_purpose: 'Personalize interaction by answering a common question with a video.', practical_example: 'Recording a Reel answering an interesting question left in the previous post.' },
    { virality_axis: 'COMMUNITY (Transparency)', content_method: '"Controversial FAQs" Content', value_purpose: 'Demonstrate openness by addressing difficult topics or brand criticisms.', practical_example: 'Video answering the 5 most uncomfortable questions asked about your service.' },
    { virality_axis: 'COMMUNITY (Inclusion)', content_method: 'Create a Collaborative Glossary', value_purpose: 'Ask the audience for definitions or ideas for a future resource.', practical_example: 'Post asking people to define success in a single word in the comments.' },
    { virality_axis: 'COMMUNITY (Feedback)', content_method: 'Portfolio or Work Review', value_purpose: 'Offer value in exchange for visibility, giving constructive criticism.', practical_example: 'Live session reviewing and giving feedback on followers\' graphic designs.' },
    { virality_axis: 'COMMUNITY (Fun)', content_method: 'Create a Brand GIF or Sticker', value_purpose: 'Create an easily shareable element in chats that represents a brand emotion.', practical_example: 'An animated GIF of an employee making a joyful gesture for an achievement.' },
    { virality_axis: 'DEPTH (Audio Summary)', content_method: 'Podcast Clip with Dynamic Subtitles', value_purpose: 'Turn long-form content into a high-value, easily digestible "sample".', practical_example: 'A 60-second clip of the most impactful quote from a 1-hour interview.' },
    { virality_axis: 'DEPTH (Narrative)', content_method: '"Threads" on X (Twitter)', value_purpose: 'Tell a story or summarize a long article in a chain of posts.', practical_example: 'Summarizing a 3,000-word research paper in 12 narrative and engaging tweets.' },
    { virality_axis: 'DEPTH (Motivation)', content_method: 'Inspirational Quotes with Data Graphics', value_purpose: 'Provide a dose of inspiration based on hard evidence.', practical_example: 'A motivational quote from your Ebook, accompanied by the metric that validates it.' },
    { virality_axis: 'DEPTH (Micro-Education)', content_method: 'Reel with "Mini-Class" from Webinar', value_purpose: 'Distill the most valuable points of a long event into a very short video.', practical_example: 'Cutting 3 key tips from a 60-minute webinar into a 45-second Reel.' },
    { virality_axis: 'DEPTH (Expectation)', content_method: 'The "Teaser" for the Next Project', value_purpose: 'Generate excitement and anticipation for something big to come.', practical_example: 'Short video showing the behind-the-scenes of your next book cover.' },
    { virality_axis: 'DEPTH (Reference)', content_method: '"Printable" Poster of Golden Rules', value_purpose: 'Create a resource the audience will want to save, print, or use as a wallpaper.', practical_example: 'A minimalist design with "The 5 Fundamental Rules of Good Saving."' },
    { virality_axis: 'DEPTH (Structure)', content_method: 'Unique Mind Map or Diagram', value_purpose: 'Organize complex concepts in a visually attractive and easy-to-understand way.', practical_example: 'A diagram showing the interconnections between Branding, SEO, and Content Marketing.' },
    { virality_axis: 'DEPTH (Curiosity)', content_method: '"What you didn\'t know" Video', value_purpose: 'Reveal little-known facts that come from the brand\'s internal experience.', practical_example: '"3 things that happened when we launched our first product that we never told you."' },
    { virality_axis: 'DEPTH (Transparency)', content_method: 'Pricing Table or Service Comparison', value_purpose: 'Show value transparently in relation to the competition (objectively).', practical_example: 'A simple image comparing the key features of your software vs. the market leader.' },
    { virality_axis: 'DEPTH (Humanization)', content_method: 'The Open Letter (Genuine Message)', value_purpose: 'A long-form text post that explains the mission and the "why" of the brand.', practical_example: 'LinkedIn post explaining the personal reason why you started your business.' }
  ];

  await db.insertInto('value_strategies').values(strategies).execute();

  // Enable RLS
  await db.schema.alterTable('value_strategies').alter((builder) => builder.enableRowLevelSecurity()).execute();

  // Policies
  // Allow all authenticated users to read all value strategies.
  await db.schema.createPolicy('Allow read access to all users')
    .for('value_strategies')
    .on('SELECT')
    .to('authenticated')
    .using('true')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('value_strategies').execute();
}
