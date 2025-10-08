
'use server';

/**
 * @fileOverview A flow to generate a social media post from a customer testimonial.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

const CreateContentFromTestimonialInputSchema = z.object({
  testimonialId: z.string(),
  testimonialText: z.string(),
});

const SocialPostDraftSchema = z.object({
  copy: z.string().describe('The full ad copy for the social media post, including a headline, body text, and a call to action.'),
  hashtags: z.string().describe('A space-separated list of relevant hashtags.'),
  creative_prompt: z.string().describe('A detailed, ready-to-use prompt for an AI image or video generator to create the visual for this content piece.'),
  offeringId: z.string().describe('The ID of the offering this testimonial is for.'),
});

const prompt = ai.definePrompt({
  name: 'createContentFromTestimonialPrompt',
  input: {
    schema: z.object({
      brandHeart: z.any(),
      offering: z.any(),
      testimonialText: z.string(),
    }),
  },
  output: { schema: SocialPostDraftSchema },
  prompt: `You are an expert marketing copywriter who specializes in turning customer stories into authentic, high-converting social media content.

**Your Goal:** Transform the provided customer testimonial into a powerful social media post that feels genuine and compelling, while aligning with the brand's soul.

---
**1. The Brand's Soul (Your Compass for Tone & Voice):**
- **Brand Name:** {{brandHeart.brand_name}}
- **Tone of Voice:** {{brandHeart.tone_of_voice.primary}}
- **Values:** {{brandHeart.values.primary}}
- **Visual Identity:** {{brandHeart.visual_identity.primary}}

**2. The Offering (The Context):**
- **Title:** {{offering.title.primary}}
- **ID:** {{offering.id}}

**3. The Customer's Voice (The Raw Material):**
- **Testimonial:** "{{testimonialText}}"
---

**YOUR TASK:**

Create a complete social media post draft based on the testimonial. You MUST generate the following fields:

1.  **offeringId**: The ID of the offering, which is '{{offering.id}}'.
2.  **copy**: Write the social media post. Start with a hook derived from the testimonial. Weave the customer's story into a narrative that highlights a key transformation or benefit of the offering. End with a gentle, inviting call to action. The entire post must embody the brand's **Tone of Voice**.
3.  **hashtags**: Generate a space-separated list of 5-7 relevant hashtags that capture the essence of the post and the brand's values.
4.  **creative_prompt**: Write a detailed, visually rich prompt for an AI image generator (like Midjourney or DALL-E). The prompt should create a visual that emotionally complements the testimonial's story and aligns with the brand's **Visual Identity**.

Return the result in the specified JSON format.
`,
});

export const createContentFromTestimonialFlow = ai.defineFlow(
  {
    name: 'createContentFromTestimonialFlow',
    inputSchema: CreateContentFromTestimonialInputSchema,
  },
  async ({ testimonialId, testimonialText }) => {
    console.log('[Flow: createContentFromTestimonial] -- START --', { testimonialId });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    // 1. Fetch the testimonial to get the offering_id
    const { data: testimonial, error: testimonialError } = await supabase
      .from('testimonials')
      .select('offering_id')
      .eq('id', testimonialId)
      .single();

    if (testimonialError || !testimonial) {
      console.error('[Flow] Error fetching testimonial:', testimonialError);
      throw new Error('Could not find the original testimonial.');
    }
    const { offering_id } = testimonial;

    // 2. Fetch Brand Heart and Offering in parallel
    console.log('[Flow] Fetching Brand Heart and Offering data...');
    const [
      { data: brandHeart, error: brandHeartError },
      { data: offering, error: offeringError },
    ] = await Promise.all([
      supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
      supabase.from('offerings').select('id, title').eq('id', offering_id).single(),
    ]);

    if (brandHeartError || !brandHeart) throw new Error('Brand Heart not found.');
    if (offeringError || !offering) throw new Error('Could not find the related offering.');

    console.log('[Flow] Data fetched. Generating AI content...');
    // 3. Generate the social post draft
    const { output } = await prompt({
      brandHeart,
      offering,
      testimonialText,
    });

    if (!output) {
      throw new Error('The AI model did not return a response.');
    }
    console.log('[Flow] AI content generated. Preparing to save...');

    // 4. Save the generated draft to the media_plan_items table
    const { copy, hashtags, creative_prompt, offeringId } = output;
    
    // We don't have a media plan, so we create a placeholder or find a generic one
    // For now, let's assume we can create items without a media_plan_id
    const { data: newItem, error: insertError } = await supabase
      .from('media_plan_items')
      .insert({
        user_id: user.id,
        offering_id: offeringId,
        copy,
        hashtags,
        creative_prompt,
        status: 'queued_for_generation', // Ready to be picked up by the Artisan view
        concept: `Content from testimonial by ${testimonial?.customer_name || 'a customer'}`,
        objective: 'Leverage social proof to build trust and drive interest.',
        format: 'Social Media Post', // A sensible default
      })
      .select('id')
      .single();

    if (insertError || !newItem) {
      console.error('[Flow] Error saving new content item:', insertError);
      throw new Error('Failed to save the generated content draft.');
    }

    console.log(`[Flow] -- SUCCESS -- New content item created with ID: ${newItem.id}`);
    return { success: true, newItemId: newItem.id };
  }
);
