
'use server';

import { generateAutomatedMarketAnalysis as generateAutomatedMarketAnalysisFlow } from '@/ai/flows/generate-automated-market-analysis-flow';
import type { AutomatedMarketAnalysis } from '@/ai/flows/types';

/**
 * Invokes the Genkit flow to generate an automated market analysis report.
 * This function is designed to be called from the client.
 * It will implicitly use the user's Brand Heart and Offerings data.
 *
 * @returns {Promise<AutomatedMarketAnalysis>} The AI-generated market analysis report.
 */
export async function generateAutomatedMarketAnalysis(): Promise<AutomatedMarketAnalysis> {
  console.log('[ACTION: generateAutomatedMarketAnalysis] --- Execution Start ---');
  
  try {
    const result = await generateAutomatedMarketAnalysisFlow();
    console.log('[ACTION: generateAutomatedMarketAnalysis] --- Execution End --- Successfully received result from flow.');
    return result;
  } catch (error: any) {
    console.error('[ACTION: generateAutomatedMarketAnalysis] --- FATAL ERROR ---', error);
    // Re-throw the error with a more specific message for the client
    throw new Error(`Failed to generate market analysis: ${error.message}`);
  }
}
