

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';
import { generateFunnelPreview as genFunnelFlow, type GenerateFunnelInput, type GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import { generateMediaPlanForStrategy as generateMediaPlanFlow, regeneratePlanItem as regeneratePlanItemFlow } from '@/ai/flows/generate-media-plan-flow';
import type { GenerateMediaPlanInput, GenerateMediaPlanOutput, RegeneratePlanItemInput, PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { saveContent as saveContentAction } from '@/app/offerings/actions';

export type { PlanItem };

export type Funnel = {
    id: string;
    user_id: string;
    offering_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    preset_id: number;
    goal: string | null;
    strategy_brief: GenerateFunnelOutput | null;
    media_plan: PlanItem[] | null;
    offerings: {
        id: string;
        title: { primary: string | null };
    } | null;
}

export type FunnelPreset = {
    id: number;
    user_id: string | null;
    type: string;
    title: string;
    description: string;
    best_for: string;
    principles: string;
};

export async function getFunnels(offeringId?: string): Promise<Funnel[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
        .from('funnels')
        .select(`
            *,
            offerings (id, title)
        `)
        .eq('user_id', user.id);

    if (offeringId) {
        query = query.eq('offering_id', offeringId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching funnels:', error.message);
        throw new Error('Could not fetch funnels.');
    }

    return data as Funnel[];
}

export async function generateFunnelPreview(input: GenerateFunnelInput): Promise<GenerateFunnelOutput> {
    try {
        const result = await genFunnelFlow(input);
        return result;
    } catch (error: any) {
        console.error('Funnel preview generation failed in action:', error);
        throw new Error(`Failed to generate funnel preview: ${error.message}`);
    }
}

type CreateFunnelParams = {
    presetId: number;
    offeringId: string;
    funnelName: string;
    goal: string;
    strategyBrief: GenerateFunnelOutput;
}

export async function createFunnel({ presetId, offeringId, funnelName, goal, strategyBrief }: CreateFunnelParams): Promise<Funnel> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .insert({
            offering_id: offeringId,
            user_id: user.id,
            name: funnelName,
            preset_id: presetId,
            goal: goal,
            strategy_brief: strategyBrief,
        })
        .select(`*, offerings (id, title)`)
        .single();
    
    if (funnelError || !funnel) {
        console.error('Error creating funnel record:', funnelError?.message);
        throw new Error(`Could not create funnel record in the database. DB error: ${funnelError?.message}`);
    }
    
    revalidatePath('/funnels');
    revalidatePath(`/offerings`);
    return funnel as Funnel;
}

type UpdateFunnelParams = Partial<{
    presetId: number;
    offeringId: string;
    funnelName: string;
    goal: string;
    strategyBrief: GenerateFunnelOutput;
    mediaPlan: PlanItem[] | null;
}>;


export async function updateFunnel(funnelId: string, updates: UpdateFunnelParams): Promise<Funnel> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { funnelName, goal, strategyBrief, mediaPlan } = updates;
    
    const payload: { [key: string]: any } = {
        updated_at: new Date().toISOString()
    };
    if (funnelName) payload.name = funnelName;
    if (goal) payload.goal = goal;
    if (strategyBrief) payload.strategy_brief = strategyBrief;
    if (mediaPlan !== undefined) payload.media_plan = mediaPlan;
    
    const { data, error } = await supabase
        .from('funnels')
        .update(payload)
        .eq('id', funnelId)
        .eq('user_id', user.id)
        .select(`*, offerings (id, title)`)
        .single();
    
    if (error) {
        console.error("Error updating funnel:", error);
        throw new Error("Could not update the strategy.");
    }
    
    revalidatePath('/funnels');
    return data as Funnel;
}

export async function deleteFunnel(funnelId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', funnelId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting funnel:', error.message);
        throw new Error('Could not delete the funnel.');
    }

    revalidatePath('/funnels');
    return { message: 'Funnel deleted successfully.' };
}


export async function getFunnelPresets(): Promise<FunnelPreset[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('funnel_presets').select('*').order('id');
    if (error) {
        console.error("Error fetching funnel presets:", error);
        throw new Error("Could not fetch funnel presets.");
    }
    return data;
}


export async function saveCustomFunnelPreset(formData: Omit<FunnelPreset, 'id' | 'user_id' | 'type'>): Promise<FunnelPreset> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const newType = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const payload = { ...formData, type: `${user.id.substring(0, 4)}-${newType}`, user_id: user.id };
    const { data, error } = await supabase.from('funnel_presets').insert(payload).select().single();

    if (error) {
        console.error("Error saving custom funnel preset:", error);
        if (error.code === '23505') throw new Error("A preset with a similar title already exists.");
        throw new Error("Could not save the custom funnel preset.");
    }

    revalidatePath('/funnels');
    return data;
}


export async function updateCustomFunnelPreset(presetId: number, formData: Omit<FunnelPreset, 'id' | 'user_id' | 'type'>): Promise<FunnelPreset> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const newType = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const payload = { ...formData, type: `${user.id.substring(0, 4)}-${newType}` };

    const { data, error } = await supabase.from('funnel_presets').update(payload).eq('id', presetId).eq('user_id', user.id).select().single();
    
    if (error) {
        console.error("Error updating custom funnel preset:", error);
        if (error.code === '23505') throw new Error("A preset with a similar title already exists.");
        throw new Error("Could not update the custom funnel preset.");
    }

    revalidatePath('/funnels');
    return data;
}


export async function deleteCustomFunnelPreset(presetId: number): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase.from('funnel_presets').delete().eq('id', presetId).eq('user_id', user.id);

    if (error) {
        console.error("Error deleting custom funnel preset:", error);
        throw new Error("Could not delete the custom funnel preset.");
    }
    
    revalidatePath('/funnels');
    return { message: "Custom funnel preset deleted successfully." };
}

// Media Plan Actions
export async function generateMediaPlan(input: GenerateMediaPlanInput): Promise<GenerateMediaPlanOutput> {
    try {
        return await generateMediaPlanFlow(input);
    } catch (error: any) {
        console.error("Media Plan generation action failed:", error);
        throw new Error(`Failed to generate media plan: ${error.message}`);
    }
}

export async function regeneratePlanItem(input: RegeneratePlanItemInput): Promise<PlanItem> {
    try {
        return await regeneratePlanItemFlow(input);
    } catch (error: any) {
        console.error("Plan item regeneration action failed:", error);
        throw new Error(`Failed to regenerate plan item: ${error.message}`);
    }
}

export async function saveContent(input: Parameters<typeof saveContentAction>[0]): Promise<{ message: string }> {
    return saveContentAction(input);
}


export async function getPublicLandingPage(pageId: string): Promise<Data | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('funnels')
        .select('landing_page_content')
        .eq('landing_page_id', pageId)
        .single();
    
    if (error || !data) {
        return null;
    }

    return data.landing_page_content as Data;
}

type SaveLandingPageParams = {
    funnelId: string;
    data: Data;
};

export async function saveLandingPage({ funnelId, data }: SaveLandingPageParams): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('funnels')
        .update({
            landing_page_content: data,
            // If landing_page_id is null, set a new one.
            landing_page_id: `lp_${crypto.randomUUID()}`
        })
        .eq('id', funnelId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error saving landing page:', error);
        throw new Error('Could not save the landing page.');
    }

    revalidatePath(`/funnels/${funnelId}/edit`);
    return { message: 'Landing page saved successfully.' };
}


export async function getLandingPage(funnelId: string): Promise<Data | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('funnels')
        .select('landing_page_content')
        .eq('id', funnelId)
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        console.error('Error fetching landing page data:', error);
        return null;
    }

    return data.landing_page_content as Data;
}
