

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';
import { generateFunnelPreview as genFunnelFlow, type GenerateFunnelInput, type GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';

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

export async function createFunnel({ presetId, offeringId, funnelName, goal, strategyBrief }: CreateFunnelParams): Promise<string> {
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
        .select('id, name, strategy_brief')
        .single();
    
    if (funnelError || !funnel) {
        console.error('Error creating funnel record:', funnelError?.message);
        throw new Error(`Could not create funnel record in the database. DB error: ${funnelError?.message}`);
    }
    
    const websiteStrategy = funnel.strategy_brief?.strategy.find(s => funnel.strategy_brief?.channels?.includes('website'));

    if (websiteStrategy) {
        const pageContent = websiteStrategy.conceptualSteps.map(step => `## ${step.objective}\n\n${step.concept}`).join('\n\n');
        
        const initialData: Data = {
            content: [
                {
                    type: 'Hero',
                    props: {
                        title: websiteStrategy.keyMessage || funnel.name,
                        description: websiteStrategy.objective || ''
                    },
                },
                {
                    type: 'Text',
                    props: {
                        text: pageContent,
                        align: 'left',
                    }
                }
            ],
            root: {
                props: {
                    title: funnel.name
                }
            }
        };

        const { error: stepError } = await supabase.from('funnel_steps').insert({
            funnel_id: funnel.id,
            user_id: user.id,
            step_type: 'landing_page',
            step_order: 1,
            data: initialData,
        });

        if (stepError) {
             console.error('Error creating initial landing page step:', stepError?.message);
        }
    }


    revalidatePath('/funnels');
    revalidatePath(`/offerings`);
    return funnel.id;
}


export async function updateFunnel(funnelId: string, updates: { name: string; goal: string; strategyBrief: GenerateFunnelOutput }): Promise<Funnel> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { name, goal, strategyBrief } = updates;
    
    const { data, error } = await supabase
        .from('funnels')
        .update({
            name,
            goal,
            strategy_brief: strategyBrief,
            updated_at: new Date().toISOString()
        })
        .eq('id', funnelId)
        .eq('user_id', user.id)
        .select(`
            *,
            offerings (id, title)
        `)
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
        .eq('path', `lp-${funnelId.substring(0, 8)}`)
        .eq('step_type', 'landing_page')
        .single();
    
    if (error || !funnelStep) {
        return null;
    }
    
    return funnelStep.data as Data;
}

export async function getFunnelPresets(): Promise<FunnelPreset[]> {
    const supabase = createClient();
    // RLS is enabled, so this will fetch global presets (user_id IS NULL)
    // and presets owned by the current user.
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

    const payload = {
        ...formData,
        type: `${user.id.substring(0, 4)}-${newType}`, // Create a unique type
        user_id: user.id
    };

    const { data, error } = await supabase.from('funnel_presets').insert(payload).select().single();

    if (error) {
        console.error("Error saving custom funnel preset:", error);
        if (error.code === '23505') { // unique constraint violation
            throw new Error("A preset with a similar title already exists. Please choose a different title.");
        }
        throw new Error("Could not save the custom funnel preset.");
    }

    revalidatePath('/funnels');
    return data;
}


export async function updateCustomFunnelPreset(presetId: number, formData: Omit<FunnelPreset, 'id' | 'user_id' | 'type'>): Promise<FunnelPreset> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Ensure type is not updated directly by user, re-generate it
    const newType = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const payload = {
        ...formData,
        type: `${user.id.substring(0, 4)}-${newType}`,
    };

    const { data, error } = await supabase
        .from('funnel_presets')
        .update(payload)
        .eq('id', presetId)
        .eq('user_id', user.id) // Security check: user can only update their own presets
        .select()
        .single();
    
    if (error) {
        console.error("Error updating custom funnel preset:", error);
        if (error.code === '23505') {
            throw new Error("A preset with a similar title already exists. Please choose a different title.");
        }
        throw new Error("Could not update the custom funnel preset.");
    }

    revalidatePath('/funnels');
    return data;
}


export async function deleteCustomFunnelPreset(presetId: number): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
        .from('funnel_presets')
        .delete()
        .eq('id', presetId)
        .eq('user_id', user.id); // Security check

    if (error) {
        console.error("Error deleting custom funnel preset:", error);
        throw new Error("Could not delete the custom funnel preset.");
    }
    
    revalidatePath('/funnels');
    return { message: "Custom funnel preset deleted successfully." };
}
