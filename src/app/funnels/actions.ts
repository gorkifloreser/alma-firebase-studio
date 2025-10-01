// @functional: This component and its related features (funnels, presets, media orchestration) are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-10-02

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

export type PlanItemForSave = Partial<PlanItem> & { 
    id?: string;
    status?: string;
    creative_prompt?: string;
    stage_name?: string;
};

export type UserChannelSetting = {
    id: number;
    channel_name: string;
};

export type MediaPlanItem = { 
    id: string;
    media_plan_id: string;
    user_id: string;
    offering_id: string | null;
    format: string | null;
    copy: string | null;
    hashtags: string | null;
    creative_prompt: string | null;
    suggested_post_at: string | null;
    created_at: string;
    stage_name: string | null;
    objective: string | null;
    concept: string | null;
    status: string; 
    user_channel_id: number | null;
    user_channel_settings: { channel_name: string } | null;
};

export type MediaPlan = {
    id: string;
    funnel_id: string;
    created_at: string;
    title: string;
    campaign_start_date: string | null;
    campaign_end_date: string | null;
    media_plan_items: MediaPlanItem[] | null;
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
                media_plan_items!media_plan_id (
                    *,
                    user_channel_settings (id, channel_name)
                )
            )
        `)
        .eq('user_id', user.id);

    if (offeringId) {
        query = query.eq('offering_id', offeringId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[actions.ts:getFunnels] Error fetching funnels:', error.message);
        throw new Error(`Could not fetch funnels: "${'\"'}${error.message}${'\"'}"`);
    }

    return data as Funnel[];
}

export async function getFunnel(funnelId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('funnels')
        .select(`
            *,
            offerings (id, title),
            media_plans!funnel_id (
                *,
                media_plan_items!media_plan_id (
                    *,
                    user_channel_settings (id, channel_name)
                )
            )
        `)
        .eq('id', funnelId)
        .eq('user_id', user.id)
        .single();
    
    if (error) {
        console.error(`[actions.ts:getFunnel] Error fetching funnel ${funnelId}:`, error.message);
        throw new Error(`Could not fetch funnel: ${error.message}`);
    }

    return { data: data as Funnel };
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

type SaveMediaPlanParams = {
    id: string | null; // ID of the media plan to update, or null for new
    funnelId: string;
    title: string;
    planItems: PlanItemForSave[];
    startDate: string | null;
    endDate: string | null;
};

export async function saveMediaPlan({ id, funnelId, title, planItems, startDate, endDate }: SaveMediaPlanParams): Promise<MediaPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let mediaPlanId = id;

    if (mediaPlanId) {
        const { error } = await supabase.from('media_plans').update({ title, campaign_start_date: startDate, campaign_end_date: endDate, updated_at: new Date().toISOString() }).eq('id', mediaPlanId);
        if (error) throw new Error(`Could not update media plan: ${error.message}`);
    } else {
        const { data, error } = await supabase.from('media_plans').insert({ funnel_id: funnelId, user_id: user.id, title, campaign_start_date: startDate, campaign_end_date: endDate }).select().single();
        if (error || !data) throw new Error(`Could not create media plan: ${error?.message}`);
        mediaPlanId = data.id;
    }

    const { data: userChannels, error: channelsError } = await supabase.from('user_channel_settings').select('id, channel_name').eq('user_id', user.id);
    if (channelsError) throw new Error("Could not fetch user channel settings.");
    const channelNameToIdMap = new Map(userChannels.map(c => [c.channel_name, c.id]));

    const itemsToUpdate = planItems.filter(item => item.id && !item.id.startsWith('temp-'));
    const itemsToInsert = planItems.filter(item => !item.id || item.id.startsWith('temp-'));
    const existingItemIds = itemsToUpdate.map(item => item.id);

    if (existingItemIds.length > 0) {
        const { error: deleteError } = await supabase.from('media_plan_items').delete().eq('media_plan_id', mediaPlanId).not('id', 'in', `(${existingItemIds.join(',')})`);
        if (deleteError) console.warn("Could not delete old media plan items:", deleteError.message);
    } else if (planItems.length === 0) {
        const { error: deleteAllError } = await supabase.from('media_plan_items').delete().eq('media_plan_id', mediaPlanId);
        if (deleteAllError) console.warn("Could not clear all media plan items:", deleteAllError.message);
    }
    
    if (itemsToUpdate.length > 0) {
        const updates = itemsToUpdate.map(item => {
            const { id: itemId, ...rest } = item;
            const channelId = channelNameToIdMap.get((rest as any).user_channel_settings?.channel_name || '');
            const payload = {
                ...rest,
                media_plan_id: mediaPlanId,
                user_id: user.id,
                user_channel_id: channelId,
            };
            delete (payload as any).user_channel_settings;
            return supabase.from('media_plan_items').update(payload).eq('id', itemId!);
        });
        await Promise.all(updates);
    }

    if (itemsToInsert.length > 0) {
        const inserts = itemsToInsert.map(item => {
            const { id: _, ...rest } = item;
            const channelId = channelNameToIdMap.get((rest as any).user_channel_settings?.channel_name || '');
            const payload = {
                ...rest,
                media_plan_id: mediaPlanId,
                user_id: user.id,
                user_channel_id: channelId,
            };
            delete (payload as any).user_channel_settings;
            return payload;
        });
        const { error: insertError } = await supabase.from('media_plan_items').insert(inserts);
        if (insertError) throw new Error(`Could not insert new media plan items: ${insertError.message}`);
    }

    revalidatePath('/funnels');
    
    const { data: finalPlan, error: finalPlanError } = await supabase.from('media_plans').select('*, media_plan_items!inner(*, user_channel_settings(id, channel_name))').eq('id', mediaPlanId).single();
    if (finalPlanError) throw new Error("Failed to fetch the updated plan.");

    return finalPlan as MediaPlan;
}

export async function deleteMediaPlan(planId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data: itemIds, error: itemIdsError } = await supabase
        .from('media_plan_items')
        .select('id')
        .eq('media_plan_id', planId)
        .eq('user_id', user.id);

    if (itemIdsError) {
        console.error('Error fetching item IDs for deletion check:', itemIdsError);
        throw new Error("Could not verify plan's content status.");
    }
    
    if (itemIds && itemIds.length > 0) {
        const ids = itemIds.map(item => item.id);
        
        const { data: content, error: contentError } = await supabase
            .from('content')
            .select('id')
            .in('media_plan_item_id', ids)
            .in('status', ['scheduled', 'published'])
            .limit(1);

        if (contentError) {
            console.error('Error checking content status:', contentError);
            throw new Error("Could not verify plan's content status.");
        }
        
        if (content && content.length > 0) {
            throw new Error("Cannot delete this media plan because some of its content has already been scheduled or published. Please unschedule it first.");
        }
    }

    const { error } = await supabase
        .from('media_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting media plan:', error);
        throw new Error(`Could not delete media plan: ${error.message}`);
    }

    revalidatePath('/funnels');
    return { message: "Media plan deleted successfully." };
}

export async function addMultipleToArtisanQueue(funnelId: string, offeringId: string, mediaPlanItemIds: string[]): Promise<{ count: number }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (mediaPlanItemIds.length === 0) return { count: 0 };
    if (!offeringId) throw new Error("An offering ID is required to queue items.");

    const { error: statusError } = await supabase
        .from('media_plan_items')
        .update({ status: 'approved' })
        .in('id', mediaPlanItemIds)
        .eq('user_id', user.id);
        
    if (statusError) {
        console.error('Bulk status update failed:', statusError);
        throw new Error(`Could not update item statuses. DB Error: ${statusError.message}`);
    }

    const recordsToInsert = mediaPlanItemIds.map(itemId => ({
        user_id: user.id,
        funnel_id: funnelId,
        offering_id: offeringId,
        media_plan_item_id: itemId,
        status: 'pending' as const,
    }));

    const { error: queueError } = await supabase
        .from('content_generation_queue')
        .upsert(recordsToInsert, { onConflict: 'user_id, media_plan_item_id' });

    if (queueError) {
        console.error('Bulk add to queue failed:', queueError);
        await supabase
            .from('media_plan_items')
            .update({ status: 'draft' })
            .in('id', mediaPlanItemIds)
            .eq('user_id', user.id);
        throw new Error(`Could not add items to the Artisan Queue. DB Error: ${queueError.message}`);
    }
    
    return { count: mediaPlanItemIds.length };
}


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
    
    return data.map(row => ({
        id: row.channel_name,
        name: row.channel_name,
        description: '',
        icon: '',
        category: 'social',
        status: 'available',
        best_practices: row.best_practices,
    }));
}

export async function getMediaPlans(): Promise<{ id: string; title: string; offering_id: string; offering_title: string | null }[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: mediaPlans, error: mediaPlansError } = await supabase
        .from('media_plans')
        .select('id, title, funnel_id')
        .eq('user_id', user.id)
        .not('funnel_id', 'is', null);

    if (mediaPlansError) {
        console.error('Error fetching media plans:', mediaPlansError);
        throw new Error(`Could not fetch media plans. DB Error: ${mediaPlansError.message}`);
    }
    if (!mediaPlans || mediaPlans.length === 0) {
        return [];
    }

    const funnelIds = [...new Set(mediaPlans.map(plan => plan.funnel_id))];

    const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('id, offering_id, offerings(title)')
        .in('id', funnelIds);

    if (funnelsError) {
        console.error('Error fetching related funnels:', funnelsError);
        throw new Error(`Could not fetch funnel details. DB Error: ${funnelsError.message}`);
    }

    const funnelDetailsMap = new Map(
        funnels.map(f => [f.id, {
            offering_id: f.offering_id,
            offering_title: (f.offerings as any)?.title?.primary || 'Untitled Offering'
        }])
    );

    const result = mediaPlans.map(plan => {
        const funnelDetails = funnelDetailsMap.get(plan.funnel_id);
        return {
            id: plan.id,
            title: plan.title,
            offering_id: funnelDetails?.offering_id || '',
            offering_title: funnelDetails?.offering_title || 'Untitled Offering',
        };
    });

    return result;
}

export async function getMediaPlanItems(mediaPlanId: string): Promise<MediaPlanItem[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('media_plan_items')
        .select(`
            *,
            user_channel_settings (id, channel_name)
        `)
        .eq('user_id', user.id)
        .eq('media_plan_id', mediaPlanId);
    
    if (error) {
        console.error('Error fetching media plan items:', error);
        throw new Error(`Could not fetch media plan items. DB Error: ${error.message}`);
    }

    return data as MediaPlanItem[];
}
