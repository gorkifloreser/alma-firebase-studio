
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateAutomatedMarketAnalysisFlow } from '@/ai/flows/generate-automated-market-analysis-flow';
import { findCompetitors as findCompetitorsFlow } from '@/ai/flows/find-competitors-flow';
import { generateMarketReport as generateMarketReportFlow } from '@/ai/flows/generate-market-report-flow';
import { summarizeMarket as summarizeMarketFlow } from '@/ai/flows/summarize-market-flow';
import type { AutomatedMarketAnalysis, FindCompetitorsOutput, MarketReport, GenerateMarketReportInput, SummarizeMarketOutput, Competitor as CompetitorType } from '@/ai/flows/types';
import { z } from 'zod';
import { CompetitorSchema } from '@/ai/flows/types';

export type { MarketAnalysisReport, BenchmarkingReport };

export type MarketAnalysisReport = {
    id: string;
    user_id: string;
    created_at: string;
    title: string;
    report_data: AutomatedMarketAnalysis;
};

// This type is now for the new table
export type BenchmarkingReport = {
    id: string;
    user_id: string;
    created_at: string;
    brand_name: string;
    description: string | null;
    contact_points: z.infer<typeof CompetitorSchema>['contactPoints'];
}

/**
 * Invokes the Genkit flow to generate an automated market analysis report.
 */
export async function generateAutomatedMarketAnalysis(topic?: string): Promise<AutomatedMarketAnalysis> {
  console.log('[ACTION: generateAutomatedMarketAnalysis] --- Execution Start ---');
  try {
    const result = await generateAutomatedMarketAnalysisFlow(topic);
    console.log('[ACTION: generateAutomatedMarketAnalysis] --- Execution End --- Successfully received result from flow.');
    return result;
  } catch (error: any) {
    console.error('[ACTION: generateAutomatedMarketAnalysis] --- FATAL ERROR ---', error);
    throw new Error(`Failed to generate market analysis: ${error.message}`);
  }
}

/**
 * Invokes the Genkit flow to summarize the user's market.
 */
export async function summarizeMarket(): Promise<SummarizeMarketOutput> {
  return summarizeMarketFlow();
}

/**
 * Invokes the Genkit flow to find competitors.
 */
export async function findCompetitors(marketSummary: string): Promise<FindCompetitorsOutput> {
  return findCompetitorsFlow(marketSummary);
}

/**
 * Invokes the Genkit flow to generate a specific market report.
 */
export async function generateMarketReport(input: GenerateMarketReportInput): Promise<MarketReport> {
  return generateMarketReportFlow(input);
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


// --- NEW BENCHMARKING ACTIONS ---

export async function addBenchmarkingBrand(brandData: Omit<BenchmarkingReport, 'id' | 'user_id' | 'created_at'>): Promise<BenchmarkingReport> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data, error } = await supabase
        .from('benchmarking_brands')
        .insert({ ...brandData, user_id: user.id })
        .select()
        .single();
    
    if (error) {
        throw new Error(`Failed to save brand: ${error.message}`);
    }
    revalidatePath('/market-analysis');
    return data;
}

export async function getBenchmarkingBrands(): Promise<BenchmarkingReport[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data, error } = await supabase
        .from('benchmarking_brands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to fetch brands: ${error.message}`);
    }
    return data;
}

export async function updateBenchmarkingBrand(brandId: string, brandData: Partial<Omit<BenchmarkingReport, 'id' | 'user_id' | 'created_at'>>): Promise<BenchmarkingReport> {
     const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { data, error } = await supabase
        .from('benchmarking_brands')
        .update(brandData)
        .eq('id', brandId)
        .eq('user_id', user.id)
        .select()
        .single();
    
    if (error) {
        throw new Error(`Failed to update brand: ${error.message}`);
    }
    revalidatePath('/market-analysis');
    return data;
}

export async function deleteBenchmarkingBrand(brandId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { error } = await supabase
        .from('benchmarking_brands')
        .delete()
        .eq('id', brandId)
        .eq('user_id', user.id);

    if (error) {
        throw new Error(`Failed to delete brand: ${error.message}`);
    }
    revalidatePath('/market-analysis');
    return { message: 'Brand deleted successfully.' };
}
