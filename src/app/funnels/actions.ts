
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';
import { generateFunnel as genFunnelFlow, GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';

export type Funnel = {
    id: string;
    user_id: string;
    offering_id: string;
    name: string;
    funnel_type: 'Lead Magnet' | 'Direct Offer' | 'Nurture & Convert' | 'Onboarding & Habit' | null;
    created_at: string;
    offerings: {
        id: string;
        title: { primary: string | null };
    } | null;
}

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

export async function createFunnel(funnelType: Funnel['funnel_type'], offeringId: string): Promise<string> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // 1. Generate funnel content via AI
    const funnelContent = await genFunnelFlow({ offeringId, funnelType: funnelType || '' });
    
    // 2. Create the main funnel record
    const { data: funnel, error: funnelError } = await supabase
        .from('funnels')
        .insert({
            offering_id: offeringId,
            user_id: user.id,
            name: `${funnelType}: ${funnelContent.primary.landingPage.title}`,
            funnel_type: funnelType,
        })
        .select('id')
        .single();
    
    if (funnelError || !funnel) {
        console.error('Error creating funnel record:', funnelError);
        throw new Error('Could not create funnel record.');
    }
    
    const funnelId = funnel.id;
    
    // 3. Create Puck data for the landing page
    const initialData = {
      root: {
        props: {
            title: funnelContent.primary.landingPage.title,
            style: {
                padding: '64px',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)',
          },
        },
      },
      content: [
        {
          type: 'Hero',
          props: {
            title: funnelContent.primary.landingPage.title,
            description: funnelContent.primary.landingPage.content,
            id: 'Hero',
          },
        },
        {
          type: 'Button',
          props: {
            label: 'Get Started',
            id: 'Button',
          }
        }
      ],
    };
    
    // 4. Create the landing page step
    await supabase.from('funnel_steps').insert({
        funnel_id: funnelId,
        user_id: user.id,
        step_order: 0,
        step_type: 'landing_page',
        path: `lp-${funnelId.substring(0, 8)}`,
        title: {
            primary: funnelContent.primary.landingPage.title,
            secondary: funnelContent.secondary?.landingPage.title
        },
        content: {
            primary: funnelContent.primary.landingPage.content,
            secondary: funnelContent.secondary?.landingPage.content
        },
        data: initialData,
    });
    
    // 5. Prepare and insert follow-up steps
    const followUpStepsToInsert = funnelContent.primary.followUpSequence.map((step, index) => ({
        funnel_id: funnelId,
        user_id: user.id,
        step_order: index + 1,
        step_type: 'follow_up',
        title: { 
            primary: step.title,
            secondary: funnelContent.secondary?.followUpSequence[index]?.title
        },
        content: { 
            primary: step.content,
            secondary: funnelContent.secondary?.followUpSequence[index]?.content
        },
    }));

    if (followUpStepsToInsert.length > 0) {
        await supabase.from('funnel_steps').insert(followUpStepsToInsert);
    }

    revalidatePath('/funnels');
    return funnelId;
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
        .eq('funnel_id', funnelId)
        .eq('step_type', 'landing_page')
        .single();
    
    if (error || !funnelStep) {
        return null;
    }
    
    return funnelStep.data as Data;
}
