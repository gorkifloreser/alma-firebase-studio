
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ArtStyle = {
  id: string;
  user_id: string | null;
  name: string;
  prompt_suffix: string;
  created_at: string;
};

/**
 * Fetches all art styles for the user, plus the default global styles.
 */
export async function getArtStyles(): Promise<ArtStyle[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('art_styles')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching art styles:', error);
    throw new Error('Could not fetch art styles.');
  }

  return data;
}

/**
 * Creates a new custom art style for the user.
 */
export async function createArtStyle(formData: FormData): Promise<ArtStyle> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const name = formData.get('name') as string;
  const prompt_suffix = formData.get('prompt_suffix') as string;

  if (!name || !prompt_suffix) {
    throw new Error('Name and prompt suffix are required.');
  }

  const { data, error } = await supabase
    .from('art_styles')
    .insert({ user_id: user.id, name, prompt_suffix })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating art style:', error);
    throw new Error('Could not create the art style.');
  }

  revalidatePath('/art-styles');
  return data;
}

/**
 * Updates an existing custom art style for the user.
 */
export async function updateArtStyle(styleId: string, formData: FormData): Promise<ArtStyle> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const name = formData.get('name') as string;
    const prompt_suffix = formData.get('prompt_suffix') as string;

    if (!name || !prompt_suffix) {
        throw new Error('Name and prompt suffix are required.');
    }

    const { data, error } = await supabase
        .from('art_styles')
        .update({ name, prompt_suffix })
        .eq('id', styleId)
        .eq('user_id', user.id) // Ensure user can only update their own styles
        .select()
        .single();
    
    if (error) {
        console.error('Error updating art style:', error);
        throw new Error('Could not update the art style.');
    }

    revalidatePath('/art-styles');
    return data;
}

/**
 * Deletes a custom art style for the user.
 */
export async function deleteArtStyle(styleId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('art_styles')
        .delete()
        .eq('id', styleId)
        .eq('user_id', user.id); // Ensure user can only delete their own styles

    if (error) {
        console.error('Error deleting art style:', error);
        throw new Error('Could not delete the art style.');
    }

    revalidatePath('/art-styles');
    return { message: 'Art style deleted successfully.' };
}
