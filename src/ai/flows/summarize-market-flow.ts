
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { getBrandContext } from './utils';
import type { SummarizeMarketOutput } from './types';

const prompt = ai.definePrompt({
  name: 'summarizeMarketPrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: {
    schema: z.object({
      brandHeart: z.any(),
      offerings: z.array(z.any()),
    }),
  },
  output: { schema: SummarizeMarketOutput },
  prompt: `Analyze the following brand identity and offerings. Your task is to synthesize this information into a single, concise sentence that describes the brand's target market and niche.

**Brand Identity:**
- **Brand Name:** {{brandHeart.brand_name}}
- **Mission:** {{brandHeart.mission.primary}}
- **Audience Personas:**
{{#each brandHeart.audience}}
  - **{{this.title}}**: {{this.content}}
{{/each}}

**Core Offerings:**
{{#each offerings}}
- {{this.title.primary}} ({{this.type}})
{{/each}}

**Instructions:**
Generate one single sentence that summarizes the target market. For example: "Conscious creators in the wellness space seeking to build authentic, purpose-driven brands."

Your response must be in the specified JSON format.`,
});

export async function summarizeMarket(): Promise<SummarizeMarketOutput> {
  console.log('[FLOW: summarizeMarket] --- Execution Start ---');
  try {
    const { brandHeart, offerings } = await getBrandContext();
    console.log('[FLOW: summarizeMarket] Context fetched.');

    const promptPayload = { brandHeart, offerings };
    console.log('[FLOW: summarizeMarket] Calling AI prompt with payload:', JSON.stringify(promptPayload, null, 2));

    const { output } = await prompt(promptPayload);

    if (!output) {
      console.error('[FLOW: summarizeMarket] -- FATAL ERROR -- AI model did not return a valid response.');
      throw new Error('AI model did not return a response.');
    }

    console.log('[FLOW: summarizeMarket] --- Execution End --- Successfully generated summary.');
    return output;
  } catch (error: any) {
    console.error('[FLOW: summarizeMarket] --- FATAL EXCEPTION ---', error);
    throw new Error(`Failed during market summary generation: ${error.message}`);
  }
}
