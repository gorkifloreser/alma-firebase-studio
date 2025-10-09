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
import type { Account } from '@/app/accounts/_components/AccountsClientPage';
import type { Funnel, FunnelPreset, MediaPlan, MediaPlanItem, PlanItemForSave } from './types';

export type { PlanItem, Funnel, FunnelPreset, MediaPlan, PlanItemForSave, MediaPlanItem };

export async function getFunnels(offeringId?: string): Promise<Funnel[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
        .from('funnels')
        .select(`
            *,
            offerings (id, title),
            media_plans!funnel_id (*)
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
            offerings (id, title, offering_schedules(*)),
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
    console.log("[SERVER] Step 1: saveMediaPlan action initiated.");
    console.log("[SERVER] Step 1: Received items:", JSON.stringify(planItems.map(p => ({ id: p.id, status: p.status, channel: p.user_channel_settings?.channel_name })), null, 2));


    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('[SERVER] Step 2: User authenticated:', user.id);

    const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .select('offering_id')
        .eq('id', funnelId)
        .single();

    if (funnelError || !funnel) {
        console.error('[SERVER] Step 3 - ERROR: Error fetching funnel details:', funnelError?.message);
        throw new Error(`Could not retrieve funnel details to save media plan: ${funnelError?.message}`);
    }
    console.log('[SERVER] Step 3: Funnel details fetched successfully. Offering ID:', funnel.offering_id);

    let mediaPlanId = id;

    if (mediaPlanId) {
        console.log(`[SERVER] Step 4: Updating existing media plan with ID: ${mediaPlanId}`);
        const { error } = await supabase.from('media_plans').update({ title, campaign_start_date: startDate, campaign_end_date: endDate, updated_at: new Date().toISOString() }).eq('id', mediaPlanId);
        if (error) {
             console.error('[SERVER] Step 4 - ERROR: Error updating media plan:', error.message);
             throw new Error(`Could not update media plan: ${error.message}`);
        }
        console.log(`[SERVER] Step 4: Media plan ${mediaPlanId} main details updated.`);
    } else {
        console.log(`[SERVER] Step 4: Creating new media plan with title: ${title}`);
        const { data, error } = await supabase.from('media_plans').insert({ funnel_id: funnelId, user_id: user.id, title, campaign_start_date: startDate, campaign_end_date: endDate }).select().single();
        if (error || !data) {
            console.error('[SERVER] Step 4 - ERROR: Error creating media plan:', error?.message);
            throw new Error(`Could not create media plan: ${error?.message}`);
        }
        mediaPlanId = data.id;
        console.log(`[SERVER] Step 4: New media plan created with ID: ${mediaPlanId}`);
    }

    console.log('[SERVER] Step 5: Fetching user channel settings to map names to IDs.');
    const { data: userChannels, error: channelsError } = await supabase.from('user_channel_settings').select('id, channel_name').eq('user_id', user.id);
    if (channelsError) {
        console.error('[SERVER] Step 5 - ERROR: Error fetching user channel settings:', channelsError.message);
        throw new Error("Could not fetch user channel settings.");
    }
    const channelNameToIdMap = new Map(userChannels.map(c => [c.channel_name, c.id]));
    console.log('[SERVER] Step 5: Channel name-to-ID map constructed:', channelNameToIdMap);

    const itemsToCreate = planItems.filter(item => item.id?.startsWith('temp-'));
    const itemsToUpdate = planItems.filter(item => item.id && !item.id.startsWith('temp-'));

    console.log(`[SERVER] Step 6: Found ${itemsToCreate.length} items to create and ${itemsToUpdate.length} items to update.`);

    if (itemsToCreate.length > 0) {
        const newRecords = itemsToCreate.map(item => {
            const { id: _, user_channel_settings, ...restOfItem } = item;
            const channelName = (item.user_channel_settings as any)?.channel_name || '';
            const channelId = channelNameToIdMap.get(channelName);
            if (!channelId) {
                const errorMsg = `Could not find a channel ID for channel name: "${channelName}". Please ensure the channel is set up correctly.`;
                console.error(`[SERVER] Step 6 - FATAL on CREATE: ${errorMsg}`);
                throw new Error(errorMsg);
            }
            return {
                ...restOfItem,
                media_plan_id: mediaPlanId,
                user_id: user.id,
                offering_id: funnel.offering_id,
                user_channel_id: channelId,
                status: item.status || 'draft', // Ensure status is set
            };
        });
        console.log('[SERVER] Step 6.1: Preparing to insert new records:', newRecords);
        const { error: insertError } = await supabase.from('media_plan_items').insert(newRecords);
        if (insertError) {
            console.error('[SERVER] Step 6.1 - ERROR: Error inserting new media plan items:', insertError);
            throw new Error(`Could not create new media plan items: ${insertError.message}`);
        }
        console.log('[SERVER] Step 6.1: New records inserted successfully.');
    }

    if (itemsToUpdate.length > 0) {
        console.log('[SERVER] Step 6.2: Preparing to update existing records...');
        for (const item of itemsToUpdate) {
            const { id: itemId, user_channel_settings, ...restOfItem } = item;
            const channelName = (item.user_channel_settings as any)?.channel_name || '';
            const channelId = channelNameToIdMap.get(channelName);
             if (!channelId) {
                const errorMsg = `Could not find a channel ID for channel name: "${channelName}". Please ensure the channel is set up correctly.`;
                console.error(`[SERVER] Step 6.2 - FATAL on UPDATE for item ${itemId}: ${errorMsg}`);
                throw new Error(errorMsg);
            }
            const { error: updateError } = await supabase
                .from('media_plan_items')
                .update({ 
                    ...restOfItem,
                    user_channel_id: channelId,
                    status: item.status || 'draft', // Ensure status is set
                 })
                .eq('id', itemId!);
            if (updateError) {
                console.error(`[SERVER] Step 6.2 - ERROR: Failed to update item ${itemId}:`, updateError.message);
            } else {
                console.log(`[SERVER] Step 6.2: Successfully updated item ${itemId}.`);
            }
        }
    }

    console.log('[SERVER] Step 7: Revalidating paths and fetching final plan data.');
    revalidatePath('/funnels');
    
    const { data: finalPlan, error: finalPlanError } = await supabase.from('media_plans').select('*, media_plan_items!inner(*, user_channel_settings(id, channel_name))').eq('id', mediaPlanId).single();
    if (finalPlanError) {
        console.error('[SERVER] Step 7 - ERROR: Error fetching final updated plan:', finalPlanError.message);
        throw new Error("Failed to fetch the updated plan.");
    }
    console.log('[SERVER] Step 8: saveMediaPlan completed successfully.');
    return finalPlan as MediaPlan;
}

export async function archiveMediaPlan(planId: string): Promise<MediaPlan> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
        .from('media_plans')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', planId)
        .eq('user_id', user.id)
        .select()
        .single();
        
    if (error) {
        console.error('Error archiving media plan:', error);
        throw new Error('Could not archive the media plan.');
    }
    
    revalidatePath('/funnels');
    return data as MediaPlan;
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
            .from('media_plan_items')
            .select('id')
            .in('id', ids)
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
    console.log(`[ACTION: addMultipleToArtisanQueue] -- START --`);
    console.log(`[ACTION] Funnel ID: ${funnelId}, Offering ID: ${offeringId}`);
    console.log(`[ACTION] Item IDs to queue: ${JSON.stringify(mediaPlanItemIds)}`);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('[ACTION] -- ERROR -- User not authenticated. Aborting.');
        throw new Error('User not authenticated');
    }
    console.log(`[ACTION] Authenticated User ID: ${user.id}`);

    if (mediaPlanItemIds.length === 0) {
        console.log('[ACTION] -- INFO -- No item IDs provided. Nothing to do. Exiting.');
        return { count: 0 };
    }
    if (!offeringId) {
        console.error('[ACTION] -- ERROR -- Offering ID is required but was not provided. Aborting.');
        throw new Error("An offering ID is required to queue items.");
    }
    
    console.log(`[ACTION] Updating status to 'queued_for_generation' for ${mediaPlanItemIds.length} items...`);
    const { count, error: statusError } = await supabase
        .from('media_plan_items')
        .update({ status: 'queued_for_generation' })
        .in('id', mediaPlanItemIds)
        .eq('user_id', user.id);
        
    if (statusError) {
        console.error('[ACTION] -- ERROR -- Bulk status update failed:', statusError);
        throw new Error(`Could not update item statuses. DB Error: ${statusError.message}`);
    }

    console.log(`[ACTION] Status update successful. Rows affected: ${count}`);
    console.log('[ACTION] Revalidating path: /artisan');
    revalidatePath('/artisan');
    
    console.log(`[ACTION: addMultipleToArtisanQueue] -- END -- Successfully queued ${mediaPlanItemIds.length} items.`);
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
