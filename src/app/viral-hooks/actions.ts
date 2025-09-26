
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
