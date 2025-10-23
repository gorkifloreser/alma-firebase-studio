
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateAutomatedMarketAnalysis as generateAutomatedMarketAnalysisFlow } from '@/ai/flows/generate-automated-market-analysis-flow';
import type { AutomatedMarketAnalysis } from '@/ai/flows/types';

export type MarketAnalysisReport = {
    id: string;
    user_id: string;
    created_at: string;
    title: string;
    report_data: AutomatedMarketAnalysis;
};

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

/**
 * Saves a new market analysis report to the database.
 */
export async function saveMarketAnalysisReport(title: string, reportData: AutomatedMarketAnalysis): Promise<MarketAnalysisReport> {
    console.log(`[ACTION: saveMarketAnalysisReport] --- Saving report titled: "${title}" ---`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data, error } = await supabase
        .from('market_analysis_reports')
        .insert({
            user_id: user.id,
            title,
            report_data: reportData,
        })
        .select()
        .single();
    
    if (error) {
        console.error('[ACTION: saveMarketAnalysisReport] --- DB ERROR ---', error);
        throw new Error(`Failed to save report: ${error.message}`);
    }

    revalidatePath('/market-analysis');
    console.log('[ACTION: saveMarketAnalysisReport] --- SUCCESS ---');
    return data;
}

/**
 * Fetches all market analysis reports for the current user.
 */
export async function getMarketAnalysisReports(): Promise<MarketAnalysisReport[]> {
    console.log('[ACTION: getMarketAnalysisReports] --- Fetching all reports ---');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data, error } = await supabase
        .from('market_analysis_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[ACTION: getMarketAnalysisReports] --- DB ERROR ---', error);
        throw new Error(`Failed to fetch reports: ${error.message}`);
    }
    
    console.log(`[ACTION: getMarketAnalysisReports] --- SUCCESS --- Found ${data.length} reports.`);
    return data;
}

/**
 * Deletes a market analysis report by its ID.
 */
export async function deleteMarketAnalysisReport(reportId: string): Promise<{ message: string }> {
    console.log(`[ACTION: deleteMarketAnalysisReport] --- Deleting report ID: ${reportId} ---`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('market_analysis_reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', user.id); // Ensure user can only delete their own reports

    if (error) {
        console.error('[ACTION: deleteMarketAnalysisReport] --- DB ERROR ---', error);
        throw new Error(`Failed to delete report: ${error.message}`);
    }

    revalidatePath('/market-analysis');
    console.log('[ACTION: deleteMarketAnalysisReport] --- SUCCESS ---');
    return { message: 'Report deleted successfully.' };
}