
import { z } from 'zod';

// This schema is shared between the AI flow and the frontend components.

export const OfferingScheduleDraftSchema = z.object({
  price_label: z.string().optional().describe("The descriptive label for this specific price point (e.g., 'Cacao Nibs 100g', 'Early Bird')."),
  price: z.number().optional().describe("A suggested price for this specific schedule/variant."),
  currency: z.string().optional().describe("The 3-letter currency code for this price (e.g., USD, EUR, MXN)."),
  event_date: z.string().optional().describe("If this variant is an event with a specific date, extract it in YYYY-MM-DDTHH:mm:ss.sssZ format."),
  duration: z.string().optional().describe("If this variant has a specific duration, extract it."),
  frequency: z.string().optional().describe("If this variant has a specific frequency, extract it."),
  location_label: z.string().nullable().optional().describe("If the event has a location name (e.g., 'My Studio', 'Online'), extract it. MUST be null if not specified."),
  location_address: z.string().nullable().optional().describe("If a physical address is mentioned, extract it. MUST be null if not specified."),
  location_gmaps_url: z.string().nullable().optional().describe("If a Google Maps URL is provided, extract it. MUST be null if not specified."),
});

export const OfferingDraftSchema = z.object({
  title: z.string().describe("A concise and magnetic title for the overall offering."),
  description: z.string().describe("A compelling and authentic description of the offering, embodying the brand's tone."),
  type: z.enum(['Product', 'Service', 'Event', 'Value Content']).describe("The type of offering."),
  contextual_notes: z.string().optional().describe("Any important contextual notes for the campaign (e.g., 'pre-sale discount', 'for beginners')."),
  schedules: z.array(OfferingScheduleDraftSchema).describe("An array of all the different price points, schedules, or product variants mentioned in the prompt."),
});
export type OfferingDraft = z.infer<typeof OfferingDraftSchema>;

export const GenerateOfferingDraftInputSchema = z.object({
  prompt: z.string().describe("The user's brief description of the new offering."),
});
export type GenerateOfferingDraftInput = z.infer<typeof GenerateOfferingDraftInputSchema>;


export const GenerateValueContentInputSchema = z.object({
  offeringTitle: z.string().describe("The title of the main offering for context."),
  offeringDescription: z.string().describe("The description of the main offering for context."),
  contentType: z.string().describe("The type of value content to generate (e.g., 'Key Benefit', 'Customer Story')."),
  concept: z.string().describe("The core idea or concept to be developed."),
});
export type GenerateValueContentInput = z.infer<typeof GenerateValueContentInputSchema>;

export const GenerateValueContentOutputSchema = z.object({
  developedContent: z.string().describe("The fully developed content, written in the brand's voice."),
});
export type GenerateValueContentOutput = z.infer<typeof GenerateValueContentOutputSchema>;
