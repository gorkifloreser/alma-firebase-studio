
import { z } from 'zod';

// --- COMMON ---
export const ContactPointSchema = z.object({
  type: z.enum(['Website', 'Instagram', 'Facebook', 'TikTok', 'X', 'LinkedIn', 'Other']),
  url: z.string().url(),
});

// --- GENERATE OFFERING DRAFT ---
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

// --- VALUE CONTENT ---
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

// --- MARKET RESEARCH ---
export const MarketReportSchema = z.object({
  marketSummary: z.string().describe("A 2-3 paragraph summary of the current market state, including size, growth, and key players."),
  keyTrends: z.array(z.string()).describe("A list of 3-5 key trends shaping the market."),
  opportunities: z.array(z.string()).describe("A list of 2-3 potential opportunities for the brand."),
  threats: z.array(z.string()).describe("A list of 2-3 potential threats or challenges."),
  strategicRecommendations: z.string().describe("A concluding paragraph with high-level strategic recommendations."),
});
export type MarketReport = z.infer<typeof MarketReportSchema>;

export const GenerateMarketReportInputSchema = z.object({
  topic: z.string().optional().describe("A specific topic or question for the market research."),
});
export type GenerateMarketReportInput = z.infer<typeof GenerateMarketReportInputSchema>;

export const SummarizeMarketOutputSchema = z.object({
  marketSummaryPhrase: z.string().describe("A concise, single-sentence summary of the brand's target market."),
});
export type SummarizeMarketOutput = z.infer<typeof SummarizeMarketOutputSchema>;

export const CompetitorSchema = z.object({
  brandName: z.string(),
  description: z.string().describe("A brief description of the brand and why it's a good benchmark."),
  contactPoints: z.array(ContactPointSchema),
});

export const FindCompetitorsOutputSchema = z.object({
  competitors: z.array(CompetitorSchema).describe("A list of 3-5 competitor or inspirational brands."),
});
export type FindCompetitorsOutput = z.infer<typeof FindCompetitorsOutputSchema>;

const AnalysisLevelSchema = z.object({
    strengths: z.array(z.string()).describe("List of internal brand strengths."),
    weaknesses: z.array(z.string()).describe("List of internal brand weaknesses."),
    opportunities: z.array(z.string()).describe("List of external market opportunities at this level."),
    threats: z.array(z.string()).describe("List of external market threats at this level."),
    marketGrowth: z.enum(['Growing', 'Slowing', 'Stable']).describe("The growth trend of the market at this level."),
    economicOutlook: z.enum(['Expansion', 'Recession', 'Stable']).describe("The economic outlook at this level."),
    summary: z.string().describe("A simple, 6th-grade level summary of the findings for this level."),
});

export const AutomatedMarketAnalysisSchema = z.object({
  international: AnalysisLevelSchema.describe("The analysis from a global perspective."),
  domestic: AnalysisLevelSchema.describe("The analysis for the brand's home country."),
  local: AnalysisLevelSchema.describe("The analysis for the brand's local city or region."),
  strategicSuggestions: z.array(z.string()).describe("A list of 3-4 actionable strategic suggestions based on the combined SWOT analyses."),
});
export type AutomatedMarketAnalysis = z.infer<typeof AutomatedMarketAnalysisSchema>;
