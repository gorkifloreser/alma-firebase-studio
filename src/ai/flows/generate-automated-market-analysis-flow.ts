
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { getBrandContext } from './utils';
import type { AutomatedMarketAnalysis } from './types';

const prompt = ai.definePrompt(
  {
    name: 'automatedMarketAnalysisPrompt',
    model: googleAI.model('gemini-1.5-flash-latest'),
    input: {
      schema: z.object({
        brandHeart: z.any(),
        offerings: z.array(z.any()),
      }),
    },
    output: { schema: AutomatedMarketAnalysis },
    tools: [ai.tool.webBrowser()],
    prompt: `You are an expert market analyst for conscious and creative brands. Your task is to conduct an automated market analysis based *only* on the provided brand identity. Use your web browsing tool to find current, relevant information about the industry and niche.

**Brand Identity & Context:**
- **Brand Name:** {{brandHeart.brand_name}}
- **Mission:** {{brandHeart.mission.primary}}
- **Target Audience:** 
{{#each brandHeart.audience}}
  - **{{this.title}}**: {{this.content}}
{{/each}}
- **Core Offerings:**
{{#each offerings}}
- {{this.title.primary}} ({{this.type}}): {{this.description.primary}}
{{/each}}

**Instructions:**
1.  **Analyze the Brand:** Deeply understand the brand's niche, values, audience, and offerings from the context provided.
2.  **Research Online:** Use your web browsing tool to find data on the current state of this brand's specific market.
3.  **Synthesize Findings:** Generate a concise report with the following sections:
    *   **marketSummary:** A 2-3 paragraph overview of the market, its general size, and current state.
    *   **keyTrends:** A list of 3-5 bullet points of the most important trends affecting this market right now.
    *   **customerProfile:** A brief paragraph describing the typical customer in this market, including their motivations and behaviors.
    *   **strategicSuggestions:** A list of 3-4 concrete, actionable strategic suggestions for the brand based on your analysis. These should be creative and aligned with the brand's soul.

Your response must be in the specified JSON format.`,
  },
);

export async function generateAutomatedMarketAnalysis(): Promise<AutomatedMarketAnalysis> {
  console.log('[FLOW: generateAutomatedMarketAnalysis] --- Execution Start ---');

  try {
    const { brandHeart, offerings } = await getBrandContext();
    console.log('[FLOW: generateAutomatedMarketAnalysis] Context fetched.');

    const promptPayload = { brandHeart, offerings };
     console.log('[FLOW: generateAutomatedMarketAnalysis] Calling AI prompt. Payload includes brand name:', brandHeart.brand_name);
    
    const { output } = await prompt(promptPayload);

    if (!output) {
      console.error('[FLOW: generateAutomatedMarketAnalysis] -- FATAL ERROR -- AI model did not return a valid response.');
      throw new Error('AI model did not return a response.');
    }

    console.log('[FLOW: generateAutomatedMarketAnalysis] --- Execution End --- Successfully generated report.');
    return output;
  } catch (error: any) {
    console.error('[FLOW: generateAutomatedMarketAnalysis] --- FATAL EXCEPTION ---', error);
    throw new Error(`Failed during automated market analysis: ${error.message}`);
  }
}
