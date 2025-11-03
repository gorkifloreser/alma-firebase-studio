
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBrandContext } from './utils';
import { FindCompetitorsOutputSchema } from './types';
import type { FindCompetitorsOutput } from './types';
import { googleAI } from '@genkit-ai/google-genai';

const prompt = ai.definePrompt({
  name: 'findCompetitorsPrompt',
  model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-1.5-pro-latest'),
  tools: [],
  input: {
    schema: z.object({
      marketSummary: z.string(),
    }),
  },
  output: {
    schema: FindCompetitorsOutputSchema,
  },
  prompt: `You are a market research expert. Analyze the user's query to determine their intent.

**User Query:**
"{{marketSummary}}"

**YOUR TASK:**

1.  **Determine Intent:** First, analyze the user's query. Is the user describing a general market or category (e.g., "sustainable clothing brands," "artisanal coffee roasters") OR are they asking for information about one or more specific, named brands (e.g., "Nike," "Apple Inc.")?

2.  **Execute Search:**
    *   **If the query is a market description:** Find 3 to 5 successful brands that operate in that space. They can be direct competitors or inspirational brands.
    *   **If the query is a specific brand name (or a list of names):** Fetch the profile for each specific brand mentioned.

3.  **Format Output:** For each brand you find, provide its name, a brief description of what it does and why it's a good benchmark, and a list of its key public contact points (Website, Instagram, etc.).

Use your web browsing tool to find this information. Your response must be in the specified JSON format.`,
});

export async function findCompetitors(
  marketSummary: string
): Promise<FindCompetitorsOutput> {
  console.log('[FLOW: findCompetitors] --- Execution Start ---', { marketSummary });

  try {
    const promptPayload = { marketSummary };
    console.log('[FLOW: findCompetitors] Calling AI prompt with payload:', JSON.stringify(promptPayload, null, 2));

    const { output } = await prompt(promptPayload);

    if (!output) {
      console.error('[FLOW: findCompetitors] -- FATAL ERROR -- AI model did not return a valid response.');
      throw new Error('AI model did not return competitors.');
    }

    console.log('[FLOW: findCompetitors] --- Execution End --- Successfully found competitors.');
    return output;
  } catch (error: any) {
    console.error('[FLOW: findCompetitors] --- FATAL EXCEPTION ---', error);
    throw new Error(`Failed during competitor search: ${error.message}`);
  }
}
