
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { rankViralHooks as rankViralHooksFlow } from '@/ai/flows/rank-viral-hooks-flow';
import { adaptAndSaveViralHooks as adaptAndSaveViralHooksFlow } from '@/ai/flows/adapt-viral-hooks-flow';
import { getBrandHeart } from '@/app/brand-heart/actions';
import type { RankedHook } from '@/ai/flows/rank-viral-hooks-flow';
import type { AdaptedHook } from '@/ai/flows/adapt-viral-hooks-flow';

export type ViralHook = {
    id: number;
    user_id: string | null;
    category: string;
    hook_text: string;
    created_at: string;
};

/**
 * Fetches viral hooks. Returns global hooks (user_id is null) plus
 * hooks owned by the currently authenticated user.
 */
export async function getViralHooks(): Promise<ViralHook[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await supabase
        .from('viral_hooks')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('category')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching viral hooks:", error);
        throw new Error("Could not fetch viral hooks.");
    }

    return data;
}

/**
 * Creates a new custom viral hook for the current user.
 */
export async function createViralHook(formData: { category: string, hook_text: string }): Promise<ViralHook> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    const { category, hook_text } = formData;
    if (!category || !hook_text) throw new Error("Category and hook text are required.");

    const { data, error } = await supabase
        .from('viral_hooks')
        .insert({
            user_id: user.id,
            category,
            hook_text,
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating viral hook:", error);
        throw new Error("Could not create viral hook.");
    }
    
    revalidatePath('/funnels');
    return data;
}


/**
 * Updates a custom viral hook owned by the current user.
 */
export async function updateViralHook(id: number, formData: { category: string, hook_text: string }): Promise<ViralHook> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { category, hook_text } = formData;
    if (!category || !hook_text) throw new Error("Category and hook text are required.");

    const { data, error } = await supabase
        .from('viral_hooks')
        .update({ category, hook_text })
        .eq('id', id)
        .eq('user_id', user.id) // RLS also enforces this, but it's good practice
        .select()
        .single();
    
    if (error) {
        console.error("Error updating viral hook:", error);
        throw new Error("Could not update viral hook.");
    }
    
    revalidatePath('/funnels');
    return data;
}

/**
 * Deletes a custom viral hook owned by the current user.
 */
export async function deleteViralHook(id: number): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
        .from('viral_hooks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error deleting viral hook:", error);
        throw new Error("Could not delete viral hook.");
    }

    revalidatePath('/funnels');
    return { message: "Viral hook deleted successfully." };
}

/**
 * Ranks all available viral hooks for the current user's brand.
 */
export async function rankViralHooks(): Promise<RankedHook[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");

  const [
    { data: brandHeart, error: brandHeartError },
    { data: viralHooks, error: hooksError },
  ] = await Promise.all([
    supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
    supabase.from('viral_hooks').select('*').or(`user_id.is.null,user_id.eq.${user.id}`)
  ]);

  if (brandHeartError || !brandHeart) {
    throw new Error('Brand Heart not found. Please define your brand heart first.');
  }
  if (hooksError || !viralHooks) {
    throw new Error('Could not fetch viral hooks to rank.');
  }

  try {
    const result = await rankViralHooksFlow({ brandHeart, viralHooks });
    return result.rankedHooks;
  } catch (error: any) {
    console.error('Error in rankViralHooks server action:', error);
    throw new Error(`AI ranking failed: ${error.message}`);
  }
}

/**
 * Generates and saves the top 10 adapted hooks, then returns them.
 */
export async function generateAndGetAdaptedHooks(): Promise<AdaptedHook[]> {
   try {
    const result = await adaptAndSaveViralHooksFlow();
    return result.topHooks;
  } catch (error: any) {
    console.error('Error in adaptAndSaveViralHooks server action:', error);
    throw new Error(`AI adaptation and saving failed: ${error.message}`);
  }
}

/**
 * Fetches the user's already-saved adapted hooks from the database.
 */
export async function getAdaptedHooks(): Promise<AdaptedHook[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('adapted_viral_hooks')
        .select('*')
        .eq('user_id', user.id)
        .order('virality_score', { ascending: false })
        .order('relevance_score', { ascending: false });

    if (error) {
        console.error('Error fetching adapted hooks:', error);
        return [];
    }

    return data;
}
