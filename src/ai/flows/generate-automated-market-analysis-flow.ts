
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getBrandContext } from './utils';
import { AutomatedMarketAnalysisSchema } from './types';
import type { AutomatedMarketAnalysis } from './types';


const prompt = ai.definePrompt(
  {
    name: 'automatedMarketAnalysisPrompt',
    model: googleAI.model(process.env.GENKIT_TEXT_MODEL || 'gemini-1.5-pro-latest'),
    input: {
      schema: z.object({
        brandHeart: z.any(),
        offerings: z.array(z.any()),
        topic: z.string().optional(),
        location: z.string().optional(),
      }),
    },
    output: { schema: AutomatedMarketAnalysisSchema },
    prompt: `You are an expert market analyst who explains complex topics in simple terms a 6th grader can understand. Your task is to conduct a comprehensive, three-level market analysis (International, Domestic, Local) for the provided brand, focused on a specific topic.

**CRITICAL INSTRUCTION: All text in 'summary' and 'strategicSuggestions' fields MUST be written in simple, clear English, suitable for a 12-year-old.**

**Research Topic (Your Main Focus):**
{{#if topic}}
"{{topic}}"
{{else}}
"Provide a general market overview for the niche this brand operates in."
{{/if}}

**Brand Identity & Context:**
- **Brand Name:** {{brandHeart.brand_name}}
- **Mission:** {{brandHeart.mission.primary}}
- **Offerings:**
{{#each offerings}}
- {{this.title.primary}} ({{this.type}}): {{this.description.primary}}
{{/each}}
- **User's Location Hint (CRUCIAL for Domestic/Local context):** 
{{#if location}}
  - Primary Business Address: {{location}}
{{else}}
  - No specific location provided. Assume a major city in a developed country for domestic/local analysis.
{{/if}}


**YOUR THREE-LEVEL ANALYSIS MISSION:**

For EACH of the three levels (International, Domestic, and Local), you MUST perform the following steps using your web browsing tool, always keeping the **Research Topic** in mind:

**1. SWOT Analysis:**
   - **Strengths (Internal):** 2-3 key strengths of THIS brand. (This will be the same for all levels).
   - **Weaknesses (Internal):** 2-3 potential weaknesses of THIS brand. (This will be the same for all levels).
   - **Opportunities (External):** 2-3 current market trends or gaps at THIS specific level (International, Domestic, or Local) that the brand can use.
   - **Threats (External):** 2-3 market threats at THIS specific level (e.g., competition, regulations).

**2. Key Indicators:**
   - **marketGrowth:** Determine if the market at THIS level is 'Growing', 'Slowing', or 'Stable'.
   - **economicOutlook:** Determine if the economy at THIS level is in 'Expansion', 'Recession', or 'Stable'.
   - **summary:** Write a simple, 1-2 paragraph summary explaining these findings like you're talking to a 12-year-old.

**3. Final Synthesis (Do this only ONCE, after analyzing all three levels):**
   - **strategicSuggestions:** Based on ALL the information gathered from all three SWOT analyses, provide 3-4 concrete, actionable strategic suggestions. Each suggestion should be easy to understand and directly relate to the findings (e.g., "Use your Strength in [X] to take advantage of the local Opportunity of [Y]").

Your final response must be a single JSON object with 'international', 'domestic', 'local', and 'strategicSuggestions' fields, following the required schema precisely.`,
  },
);

export async function generateAutomatedMarketAnalysisFlow(topic?: string): Promise<AutomatedMarketAnalysis> {
  console.log('[FLOW: generateAutomatedMarketAnalysis] --- Execution Start ---');

  try {
    const { brandHeart, offerings } = await getBrandContext();
    console.log('[FLOW: generateAutomatedMarketAnalysis] Context fetched.');

    const locationInfo = brandHeart.contact_info?.find((c: any) => c.type === 'location');
    const location = locationInfo?.address;

    const promptPayload = { brandHeart, offerings, topic, location };
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
