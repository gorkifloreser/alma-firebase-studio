
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI, webBrowser } from '@genkit-ai/google-genai';
import { getBrandContext } from './utils';
import { FindCompetitorsOutputSchema } from './types';
import type { FindCompetitorsOutput } from './types';

const CompetitorSchema = z.object({
  brandName: z.string(),
  description: z.string().describe("A brief description of the brand and why it's a good benchmark."),
  contactPoints: z.array(z.object({
    type: z.enum(['Website', 'Instagram', 'Facebook', 'TikTok', 'X', 'LinkedIn', 'Other']),
    url: z.string().url(),
  })),
});

const prompt = ai.definePrompt({
  name: 'findCompetitorsPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: {
    schema: z.object({
      marketSummary: z.string(),
    }),
  },
  output: {
    schema: FindCompetitorsOutputSchema,
  },
  tools: [webBrowser],
  prompt: `You are a market research expert. Based on the following market summary, find 3 to 5 successful brands that operate in this space. They can be direct competitors or inspirational brands.

For each brand, provide its name, a brief description of what it does and why it's a good benchmark, and a list of its key public contact points (Website, Instagram, etc.).

**Target Market Summary:**
"{{marketSummary}}"

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
