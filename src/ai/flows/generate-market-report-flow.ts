
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI, webBrowser } from '@genkit-ai/google-genai';
import { getBrandContext } from './utils';
import { MarketReportSchema } from './types';
import type { MarketReport, GenerateMarketReportInput } from './types';

const prompt = ai.definePrompt(
  {
    name: 'marketReportPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-1.5-flash'),
    tools: [webBrowser],
    input: {
      schema: z.object({
        brandHeart: z.any(),
        offerings: z.array(z.any()),
        topic: z.string().optional(),
      }),
    },
    output: { schema: MarketReportSchema },
    prompt: `Act as an expert market analyst. Your task is to generate a concise market report based on the provided brand identity and a specific topic. Use your web browsing tool to find current, relevant information.

**Brand Identity & Context:**
- **Brand Name:** {{brandHeart.brand_name}}
- **Mission:** {{brandHeart.mission.primary}}
- **Core Offerings:**
{{#each offerings}}
- {{this.title.primary}} ({{this.type}}): {{this.description.primary}}
{{/each}}

**Research Topic:**
{{#if topic}}
"{{topic}}"
{{else}}
"Provide a general market overview for the niche this brand operates in."
{{/if}}

**Instructions:**
1.  **Analyze the Brand:** Understand the brand's niche, values, and offerings.
2.  **Research Online:** Use your web browsing tool to find data on market size, trends, key competitors, and consumer behavior related to the brand's niche and the research topic.
3.  **Synthesize Findings:** Generate a report with the following sections:
    *   **marketSummary:** A 2-3 paragraph overview.
    *   **keyTrends:** 3-5 bullet points.
    *   **opportunities:** 2-3 potential opportunities.
    *   **threats:** 2-3 potential threats.
    *   **strategicRecommendations:** A concluding paragraph with high-level advice.

Your response must be in the specified JSON format.`,
  },
);

export async function generateMarketReport(
  input: GenerateMarketReportInput
): Promise<MarketReport> {
  console.log('[FLOW: generateMarketReport] --- Execution Start ---', { input });

  try {
    const { brandHeart, offerings } = await getBrandContext();
    console.log('[FLOW: generateMarketReport] Context fetched.');

    const promptPayload = {
      brandHeart,
      offerings,
      topic: input.topic,
    };
    console.log('[FLOW: generateMarketReport] Calling AI prompt with payload:', JSON.stringify(promptPayload, null, 2));
    
    const { output } = await prompt(promptPayload);

    if (!output) {
      console.error('[FLOW: generateMarketReport] -- FATAL ERROR -- AI model did not return a valid response.');
      throw new Error('AI model did not return a response.');
    }

    console.log('[FLOW: generateMarketReport] --- Execution End --- Successfully generated report.');
    return output;
  } catch (error: any) {
    console.error('[FLOW: generateMarketReport] --- FATAL EXCEPTION ---', error);
    throw new Error(`Failed to generate market report: ${error.message}`);
  }
}
