
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateFlow, TranslateInput, TranslateOutput } from '@/ai/flows/translate-flow';

export type Offering = {
    id?: string;
    user_id?: string;
    created_at?: string;
    title: { primary: string | null; secondary: string | null };
    description: { primary: string | null; secondary: string | null };
    type: 'Product' | 'Service' | 'Event';
    contextual_notes: string | null;
    price: number | null;
    event_date: string | null; // ISO 8601 string
    duration: string | null;
};

/**
 * Fetches all offerings for the currently authenticated user.
 * @returns {Promise<Offering[]>} A promise that resolves to an array of offerings.
 */
export async function getOfferings(): Promise<Offering[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('getOfferings: User not authenticated.');
        return [];
    }

    const { data, error } = await supabase
        .from('offerings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching offerings:', error.message);
        throw new Error('Could not fetch offerings.');
    }
    
    return data as Offering[];
}

/**
 * Creates a new offering for the currently authenticated user.
 * @param {Omit<Offering, 'id' | 'user_id' | 'created_at'>} offeringData The data for the new offering.
 * @returns {Promise<Offering>} A promise that resolves to the newly created offering.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function createOffering(offeringData: Omit<Offering, 'id' | 'user_id' | 'created_at'>): Promise<Offering> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const payload = {
    ...offeringData,
    price: offeringData.price || null,
    event_date: offeringData.type === 'Event' ? offeringData.event_date : null,
    duration: offeringData.type === 'Event' ? offeringData.duration : null,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('offerings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error creating offering:', error.message);
    throw new Error('Could not create the offering. Please try again.');
  }

  revalidatePath('/offerings');
  return data as Offering;
}

/**
 * Deletes an offering for the currently authenticated user.
 * @param {string} offeringId The ID of the offering to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function deleteOffering(offeringId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('offerings')
        .delete()
        .eq('id', offeringId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting offering:', error.message);
        throw new Error('Could not delete the offering. Please try again.');
    }

    revalidatePath('/offerings');
    return { message: 'Offering deleted successfully.' };
}


/**
 * Invokes the Genkit translation flow.
 * @param {TranslateInput} input The text and target language for translation.
 * @returns {Promise<TranslateOutput>} The translated text.
 * @throws {Error} If the translation fails.
 */
export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
    try {
        const result = await translateFlow(input);
        return result;
    } catch (error) {
        console.error("Translation action failed:", error);
        throw new Error("Failed to translate the text. Please try again.");
    }
}
