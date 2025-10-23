'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type MarketAnalysisData = {
    indice_demanda_mensual: number;
    indice_oferta_competencia: number;
    tendencia_precios_promedio: number;
    margen_ganancia_actual: number;
};

/**
 * Fetches the market analysis data for the currently authenticated user.
 * If no data exists, it returns null.
 */
export async function getMarketAnalysisData(): Promise<MarketAnalysisData | null> {
    console.log('[ACTION: getMarketAnalysisData] --- Execution Start ---');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[ACTION: getMarketAnalysisData] -- ERROR -- User not authenticated.');
        throw new Error('User not authenticated');
    }
    console.log(`[ACTION: getMarketAnalysisData] Authenticated user ID: ${user.id}`);

    try {
        const { data, error } = await supabase
            .from('market_analysis')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('[ACTION: getMarketAnalysisData] -- ERROR -- Supabase select failed:', error);
            throw new Error(`Database Error: ${error.message}`);
        }

        console.log('[ACTION: getMarketAnalysisData] Successfully fetched data:', data);
        console.log('[ACTION: getMarketAnalysisData] --- Execution End ---');
        return data;
    } catch (e: any) {
        console.error('[ACTION: getMarketAnalysisData] --- FATAL EXCEPTION ---', e);
        throw e; // Re-throw the original error
    }
}

/**
 * Creates or updates the market analysis data for the currently authenticated user.
 */
export async function updateMarketAnalysisData(data: MarketAnalysisData): Promise<{ message: string }> {
    console.log('[ACTION: updateMarketAnalysisData] --- Execution Start ---');
    console.log('[ACTION: updateMarketAnalysisData] Received data:', data);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[ACTION: updateMarketAnalysisData] -- ERROR -- User not authenticated.');
        throw new Error('User not authenticated');
    }
    console.log(`[ACTION: updateMarketAnalysisData] Authenticated user ID: ${user.id}`);

    const payload = {
        ...data,
        user_id: user.id,
        updated_at: new Date().toISOString(),
    };
    console.log('[ACTION: updateMarketAnalysisData] Preparing to upsert payload:', payload);

    try {
        const { error } = await supabase
            .from('market_analysis')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) {
            console.error('[ACTION: updateMarketAnalysisData] -- ERROR -- Supabase upsert failed:', error);
            throw new Error(`Database Error: ${error.message}`);
        }

        console.log('[ACTION: updateMarketAnalysisData] Upsert successful. Revalidating path /market-analysis.');
        revalidatePath('/market-analysis');
        
        console.log('[ACTION: updateMarketAnalysisData] --- Execution End ---');
        return { message: 'Market analysis data updated successfully.' };
    } catch(e: any) {
        console.error('[ACTION: updateMarketAnalysisData] --- FATAL EXCEPTION ---', e);
        return { message: `An unexpected error occurred: ${e.message}` };
    }
}
