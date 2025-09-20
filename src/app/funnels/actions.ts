

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';
import { generateFunnelPreview as genFunnelFlow, type GenerateFunnelInput, type GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import { generateMediaPlanForStrategy as generateMediaPlanFlow, regeneratePlanItem as regeneratePlanItemFlow } from '@/ai/flows/generate-media-plan-flow';
import type { GenerateMediaPlanInput, GenerateMediaPlanOutput, RegeneratePlanItemInput, PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { saveContent as saveContentAction } from '@/app/offerings/actions';
import type { Account } from '@/app/accounts/_components/AccountsClientPage';

export type { PlanItem };

export type MediaPlan = {
    id: string;
    funnel_id: string;
    created_at: string;
    title: string;
    campaign_start_date: string | null;
    campaign_end_date: string | null;
    media_plan_items: PlanItem[] | null;
};

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
    offerings: {
        id: string;
        title: { primary: string | null };
    } | null;
    media_plans: MediaPlan[] | null;
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
            offerings (id, title),
            media_plans!funnel_id (
                *,
                media_plan_items (*)
            )
        `)
        .eq('user_id', user.id);

    if (offeringId) {
        query = query.eq('offering_id', offeringId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching funnels:', error.message);
        throw new Error(`Could not fetch funnels: "${error.message}"`);
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
    name: string;
    goal: string;
    strategyBrief: GenerateFunnelOutput;
}

export async function createFunnel({ presetId, offeringId, name, goal, strategyBrief }: CreateFunnelParams): Promise<Funnel> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .insert({
            offering_id: offeringId,
            user_id: user.id,
            name: name,
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
    name: string;
    goal: string;
    strategyBrief: GenerateFunnelOutput;
}>;


export async function updateFunnel(funnelId: string, updates: UpdateFunnelParams): Promise<Funnel> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { name, goal, strategyBrief } = updates;
    
    const payload: { [key: string]: any } = {
        updated_at: new Date().toISOString()
    };
    if (name) payload.name = name;
    if (goal) payload.goal = goal;
    if (strategyBrief) payload.strategy_brief = strategyBrief;
    
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

export async function saveMediaPlan(funnelId: string, title: string, planItems: PlanItem[], startDate: string | null, endDate: string | null): Promise<MediaPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Create the parent media_plan record
    const { data: mediaPlan, error: mediaPlanError } = await supabase
        .from('media_plans')
        .insert({
            funnel_id: funnelId,
            user_id: user.id,
            title: title,
            campaign_start_date: startDate,
            campaign_end_date: endDate,
        })
        .select()
        .single();

    if (mediaPlanError || !mediaPlan) {
        console.error("Error saving media plan:", mediaPlanError);
        throw new Error(`Could not save the media plan: ${mediaPlanError.message}`);
    }
    
    // 2. Prepare and insert the individual items
    if (planItems && planItems.length > 0) {
        const itemsToInsert = planItems.map(item => ({
            media_plan_id: mediaPlan.id,
            user_id: user.id,
            offering_id: item.offeringId,
            channel: item.channel,
            format: item.format,
            copy: item.copy,
            hashtags: item.hashtags,
            creative_prompt: item.creativePrompt,
            conceptual_step: item.conceptualStep,
            suggested_post_at: item.suggested_post_at,
        }));

        const { error: itemsError } = await supabase
            .from('media_plan_items')
            .insert(itemsToInsert);
        
        if (itemsError) {
            // If items fail to save, we should ideally roll back the media_plan insert.
            // For now, we'll delete it and throw an error.
            console.error("Error saving media plan items:", itemsError);
            await supabase.from('media_plans').delete().eq('id', mediaPlan.id);
            throw new Error("Could not save the media plan items.");
        }
    }

    revalidatePath('/funnels');
    
    // Fetch the newly created plan with its items to return
    const { data: newPlanWithItems, error: newPlanError } = await supabase
        .from('media_plans')
        .select('*, media_plan_items (*)')
        .eq('id', mediaPlan.id)
        .single();

    if (newPlanError || !newPlanWithItems) {
        throw new Error("Failed to fetch the newly created plan.");
    }

    return newPlanWithItems as MediaPlan;
}

export async function addToArtisanQueue(funnelId: string, planItem: PlanItem): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('content_generation_queue')
        .insert({
            user_id: user.id,
            funnel_id: funnelId,
            offering_id: planItem.offeringId,
            status: 'pending',
            source_plan_item: planItem
        });

    if (error) {
        console.error('Error adding to artisan queue:', error);
        throw new Error('Could not add item to the Artisan Queue.');
    }

    return { message: 'Item added to Artisan Queue successfully.' };
}

export async function addMultipleToArtisanQueue(funnelId: string, planItems: PlanItem[]): Promise<{ count: number }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (planItems.length === 0) return { count: 0 };

    const recordsToInsert = planItems.map(item => ({
        user_id: user.id,
        funnel_id: funnelId,
        offering_id: item.offeringId,
        status: 'pending' as const,
        source_plan_item: item,
    }));

    const { count, error } = await supabase
        .from('content_generation_queue')
        .insert(recordsToInsert);

    if (error) {
        console.error('Error bulk adding to artisan queue:', error);
        throw new Error('Could not add items to the Artisan Queue.');
    }

    return { count: count || 0 };
}


/**
 * Fetches the list of enabled channels for the current user.
 * @returns {Promise<Account[]>} A promise that resolves to an array of channel objects.
 */
export async function getUserChannels(): Promise<Account[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('user_channel_settings')
        .select('channel_name, best_practices')
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching user channels:", error);
        throw new Error("Could not fetch user channels.");
    }
    
    // The component expects the `id` field, so we map `channel_name` to `id`.
    return data.map(row => ({
        id: row.channel_name,
        name: row.channel_name,
        description: '',
        icon: '',
        category: 'social', // This field is just for the UI and not stored in DB, so a default is fine
        status: 'available',
        best_practices: row.best_practices,
    }));
}
