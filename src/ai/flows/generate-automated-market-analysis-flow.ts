
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBrandContext } from './utils';
import { AutomatedMarketAnalysisSchema } from './types';
import type { AutomatedMarketAnalysis } from './types';

const prompt = ai.definePrompt(
  {
    name: 'automatedMarketAnalysisPrompt',
    model: process.env.GENKIT_TEXT_MODEL || 'gemini-1.5-flash',
    input: {
      schema: z.object({
        brandHeart: z.any(),
        offerings: z.array(z.any()),
      }),
    },
    output: { schema: AutomatedMarketAnalysisSchema },
    prompt: `You are an expert market analyst and brand strategist for conscious and creative brands.
Your task is to conduct a comprehensive market analysis based on the provided brand identity.

**Brand Identity & Context (Internal Factors):**
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
- **Brand Values & Tone:** {{brandHeart.values.primary}}, {{brandHeart.tone_of_voice.primary}}


**YOUR TWO-PHASE MISSION:**

**PHASE 1: SWOT ANALYSIS**
First, use your web browsing tool to research the current state of this brand's specific market niche. Then, conduct a SWOT analysis by synthesizing your research with the provided Brand Identity.

- **Strengths (Internal, Positive):** What are 2-3 key internal strengths of this specific brand based on its unique identity, mission, and offerings?
- **Weaknesses (Internal, Negative):** What are 2-3 potential internal weaknesses or challenges for a brand with this profile? (e.g., small scale, niche focus).
- **Opportunities (External, Positive):** Based on your web research, what are 2-3 current market trends or gaps that this brand is well-positioned to capitalize on?
- **Threats (External, Negative):** Based on your web research, what are 2-3 external market threats or challenges (e.g., competition, market saturation, economic factors) that could impact this brand?


**PHASE 2: STRATEGIC SUGGESTIONS**
Now, using ONLY the insights from your SWOT analysis, generate a concise report with the following sections:

1.  **marketSummary:** A 2-3 paragraph overview of the market, its general size, and current state.
2.  **keyTrends:** A list of 3-5 of the most important trends affecting this market right now.
3.  **customerProfile:** A brief paragraph describing the typical customer in this market.
4.  **strategicSuggestions:** A list of 3-4 concrete, actionable strategic suggestions for the brand. **Each suggestion MUST directly leverage one or more identified Strengths or Opportunities, and/or mitigate a Weakness or Threat.** For example, "Leverage the Strength of [Strength] to capitalize on the Opportunity of [Opportunity] by..."

Your final response must be a single JSON object containing all fields: \`strengths\`, \`weaknesses\`, \`opportunities\`, \`threats\`, \`marketSummary\`, \`keyTrends\`, \`customerProfile\`, and \`strategicSuggestions\`.`,
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
