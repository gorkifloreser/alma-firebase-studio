
'use server';

/**
 * @fileOverview A flow to generate a landing page for a specific offering.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const GenerateLandingPageInputSchema = z.object({
  offeringId: z.string(),
  creativePrompt: z.string().optional(),
});
export type GenerateLandingPageInput = z.infer<typeof GenerateLandingPageInputSchema>;

const GenerateLandingPageOutputSchema = z.object({
  htmlContent: z.string().describe('The full HTML content of the landing page, including inline Tailwind CSS classes.'),
});
export type GenerateLandingPageOutput = z.infer<typeof GenerateLandingPageOutputSchema>;


const prompt = ai.definePrompt({
    name: 'generateLandingPagePrompt',
    input: {
        schema: z.object({
            brandHeart: z.any(),
            offering: z.any(),
            creativePrompt: z.string().optional(),
        })
    },
    output: { schema: GenerateLandingPageOutputSchema },
    prompt: `You are an expert web developer and designer who creates beautiful, responsive, and high-converting landing pages.

**Your Task:**
Generate a complete, self-contained HTML file for a landing page. The landing page must be styled with Tailwind CSS utility classes directly in the HTML (do not use a separate CSS file or <style> tags).

**Creative Brief:**
{{#if creativePrompt}}
- **User's specific request:** "{{creativePrompt}}"
{{/if}}

**Brand Identity:**
- Brand Name: {{brandHeart.brand_name}}
- Brand Brief: {{brandHeart.brand_brief.primary}}
- Tone of Voice: {{brandHeart.tone_of_voice.primary}}
- Keywords for aesthetic: Conscious, soulful, minimalist, calm, creative, authentic, organic.

**Offering Details:**
- Title: {{offering.title.primary}}
- Description: {{offering.description.primary}}
- Type: {{offering.type}}
{{#if offering.contextual_notes}}
- Contextual Notes: {{offering.contextual_notes}}
{{/if}}

**Requirements for the HTML:**
1.  **Single File:** The entire output must be a single HTML file.
2.  **Tailwind CSS:** Use Tailwind CSS utility classes for ALL styling. You can assume Tailwind is available. Use classes for layout (flexbox, grid), spacing (p-*, m-*), typography (text-*, font-*), colors, etc.
3.  **Responsive Design:** The layout must be mobile-first and fully responsive.
4.  **Structure:** Include at least these sections:
    *   A compelling hero section with a strong headline and a call-to-action (CTA).
    *   A features or benefits section.
    *   A section with more details about the offering.
    *   A final CTA section.
5.  **Content:** The copy must be engaging, authentic, and reflect the brand's tone of voice.
6.  **No JavaScript:** Do not include any <script> tags or inline JavaScript.

Return ONLY the full HTML code for the landing page in the specified JSON format. Start with <!DOCTYPE html> and end with </html>.
`,
});

const generateLandingPageFlow = ai.defineFlow(
  {
    name: 'generateLandingPageFlow',
    inputSchema: GenerateLandingPageInputSchema,
    outputSchema: GenerateLandingPageOutputSchema,
  },
  async ({ offeringId, creativePrompt }) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const [{ data: brandHeart, error: brandHeartError }, { data: offering, error: offeringError }] = await Promise.all([
        supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
        supabase.from('offerings').select('*').eq('id', offeringId).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Offering not found.');
    
    const { output } = await prompt({ brandHeart, offering, creativePrompt });
    
    if (!output) {
      throw new Error('The AI model did not return a response for the landing page.');
    }

    return output;
  }
);


export async function generateLandingPage(input: GenerateLandingPageInput): Promise<GenerateLandingPageOutput> {
    return generateLandingPageFlow(input);
}
