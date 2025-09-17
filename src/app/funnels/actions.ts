
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// This function now expects the `data` to be a JSON string from Craft.js
export async function getLandingPage(funnelId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }
    
    // In Story 3.2, we assume a funnel maps to an offering one-to-one for simplicity.
    // So we use the offeringId as the funnelId.
    const { data, error } = await supabase
        .from('funnels')
        .select(`
            id,
            offering_id,
            funnel_steps (
                id,
                path,
                data
            )
        `)
        .eq('offering_id', funnelId)
        .eq('user_id', user.id)
        .single();
    
    if (error) {
        console.error("Error fetching funnel:", error);
        throw new Error("Could not find the funnel for this offering.");
    }
    
    const landingPageStep = data.funnel_steps.find(step => step.path);

    if (!landingPageStep) {
        throw new Error("Could not find a landing page for this funnel.");
    }

    return {
        id: landingPageStep.id,
        path: landingPageStep.path,
        data: landingPageStep.data, // This will be a JSON string or null
        offeringId: data.offering_id,
    };
}


// This function now saves the `data` as a JSON string from Craft.js
export async function saveLandingPage({ stepId, data }: { stepId: string, data: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('funnel_steps')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', stepId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error saving landing page:', error);
        throw new Error('Could not save landing page data.');
    }
    
    const { data: stepData } = await supabase.from('funnel_steps').select('path').eq('id', stepId).single();
    
    if (stepData?.path) {
        revalidatePath(`/lp/${stepData.path}`);
    }

    return { message: 'Landing page saved successfully!' };
}

// This function now expects the `data` to be a JSON string from Craft.js
export async function getPublicLandingPage(path: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
        .from('funnel_steps')
        .select('data')
        .eq('path', path)
        .single();

    if (error || !data) {
        console.error('Error fetching public landing page:', error);
        return null;
    }

    return data.data as string;
}
