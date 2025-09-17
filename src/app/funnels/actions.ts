
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';


export async function getLandingPage(funnelId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: funnelStep, error } = await supabase
        .from('funnel_steps')
        .select('id, data')
        .eq('funnel_id', funnelId)
        .eq('user_id', user.id)
        .eq('step_type', 'landing_page')
        .single();
    
    if (error) {
        console.error('Error fetching landing page data:', error);
        throw new Error('Could not fetch landing page data.');
    }

    return funnelStep.data as Data;
}


export async function saveLandingPage({ funnelId, data }: { funnelId: string, data: Data }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('funnel_steps')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('funnel_id', funnelId)
        .eq('user_id', user.id)
        .eq('step_type', 'landing_page');
        
    if (error) {
        console.error('Error saving landing page data:', error);
        throw new Error('Could not save landing page data.');
    }

    revalidatePath(`/lp/${funnelId}`);
}


export async function getPublicLandingPage(funnelId: string) {
    const supabase = createClient();

    const { data: funnelStep, error } = await supabase
        .from('funnel_steps')
        .select('data')
        .eq('funnel_id', funnelId)
        .eq('step_type', 'landing_page')
        .single();
    
    if (error || !funnelStep) {
        return null;
    }
    
    return funnelStep.data as Data;
}
