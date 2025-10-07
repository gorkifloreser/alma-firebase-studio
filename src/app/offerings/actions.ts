'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateFlow, TranslateInput, TranslateOutput } from '@/ai/flows/translate-flow';
import { generateContentForOffering as genContentFlow, GenerateContentInput, GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import { generateCreativeForOffering as genCreativeFlow, GenerateCreativeInput, GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { generateOfferingDraft as genOfferingDraftFlow, GenerateOfferingDraftInput, OfferingDraft } from '@/ai/flows/generate-offering-draft-flow';
import { generateImageDescription as genImageDescFlow, GenerateImageDescriptionInput, GenerateImageDescriptionOutput } from '@/ai/flows/generate-image-description-flow';
import { generateValueContent as genValueContentFlow } from '@/ai/flows/generate-value-content-flow';
import type { GenerateValueContentInput, GenerateValueContentOutput } from '@/ai/flows/generate-value-content-types';
import { saveContent as saveContentAction } from '@/app/artisan/actions';
import type { CalendarItem as ContentItem } from '@/app/calendar/actions';

// More specific type for the input to this wrapper
type SaveContentInput = Parameters<typeof saveContentAction>[0];

export async function saveContent(input: SaveContentInput): Promise<ContentItem> {
    return saveContentAction(input);
}



export type OfferingMedia = {
    id: string;
    offering_id: string;
    media_url: string;
    media_type: string | null;
    created_at: string;
    description: string | null;
}

export type PricePoint = {
    id?: string;
    price: number | null;
    label: string | null;
    currency: string | null;
};

export type OfferingSchedule = {
    id?: string; // Optional because it won't exist for new schedules
    offering_id?: string;
    event_date: Date | null;
    duration: string | null;
    frequency: string | null;
    location_label: string | null;
    location_address: string | null;
    location_gmaps_url: string | null;
    prices: PricePoint[];
};

export type ValueContentBlock = {
    id: string;
    type: string;
    concept: string;
    developed_content: string;
};

export type Offering = {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    title: { primary: string | null; secondary: string | null };
    description: { primary: string | null; secondary: string | null };
    type: 'Product' | 'Service' | 'Event' | 'Value Content';
    contextual_notes: string | null;
    value_content: ValueContentBlock[] | null;
    offering_schedules: OfferingSchedule[];
};

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

export async function getOffering(offeringId: string): Promise<OfferingWithMedia | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
        .from('offerings')
        .select('*, offering_media (*), offering_schedules (*)')
        .eq('id', offeringId)
        .eq('user_id', user.id)
        .single();
        
    if (error) {
        console.error("Error fetching single offering:", error);
        return null;
    }
    return data as OfferingWithMedia;
}

/**
 * Fetches all offerings for the currently authenticated user, including their media.
 * @returns {Promise<OfferingWithMedia[]>} A promise that resolves to an array of offerings.
 */
export async function getOfferings(): Promise<OfferingWithMedia[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('getOfferings: User not authenticated.');
        return [];
    }

    const { data, error } = await supabase
        .from('offerings')
        .select(`
            *,
            offering_media (
                id,
                offering_id,
                media_url,
                media_type,
                created_at,
                description
            ),
            offering_schedules (
                id,
                event_date,
                duration,
                frequency,
                location_label,
                location_address,
                location_gmaps_url,
                prices
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching offerings:', error.message);
        throw new Error('Could not fetch offerings.');
    }

    return data as OfferingWithMedia[];
}

type UpsertOfferingPayload = {
    title: { primary: string | null; secondary: string | null };
    description: { primary: string | null; secondary: string | null };
    type: 'Product' | 'Service' | 'Event' | 'Value Content';
    contextual_notes: string | null;
    value_content: ValueContentBlock[] | null;
    schedules?: OfferingSchedule[]; // Optional for create/update logic
}

/**
 * Creates a new offering and its associated schedules.
 */
export async function createOffering(offeringData: UpsertOfferingPayload): Promise<OfferingWithMedia> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { title, description, type, contextual_notes, value_content, schedules } = offeringData;

  const offeringPayload = { user_id: user.id, title, description, type, contextual_notes, value_content };

  const { data: newOffering, error } = await supabase
    .from('offerings')
    .insert(offeringPayload)
    .select()
    .single();

  if (error || !newOffering) {
    console.error('Error creating offering:', error?.message);
    throw new Error('Could not create the offering.');
  }

  if (schedules && schedules.length > 0) {
    const schedulesPayload = schedules.map(s => ({
        ...s,
        prices: s.prices,
        offering_id: newOffering.id,
        user_id: user.id,
        event_date: s.event_date ? s.event_date.toISOString() : null,
    }));
    const { error: scheduleError } = await supabase.from('offering_schedules').insert(schedulesPayload);
    if (scheduleError) {
      console.error('Error creating schedules:', scheduleError.message);
      // Rollback offering creation
      await supabase.from('offerings').delete().eq('id', newOffering.id);
      throw new Error('Could not create offering schedules.');
    }
  }

  revalidatePath('/offerings');
  return getOffering(newOffering.id).then(o => o!);
}

/**
 * Updates an existing offering and manages its schedules (create, update, delete).
 */
export async function updateOffering(offeringId: string, offeringData: UpsertOfferingPayload): Promise<OfferingWithMedia> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { title, description, type, contextual_notes, value_content, schedules = [] } = offeringData;

    // 1. Update the main offering details
    const offeringPayload = { title, description, type, contextual_notes, value_content, updated_at: new Date().toISOString() };
    const { error: offeringError } = await supabase
        .from('offerings')
        .update(offeringPayload)
        .eq('id', offeringId)
        .eq('user_id', user.id);

    if (offeringError) {
        console.error('Error updating offering:', offeringError.message);
        throw new Error('Could not update the offering.');
    }

    // 2. Manage schedules
    const schedulesToUpdate = schedules.filter(s => s.id);
    const schedulesToCreate = schedules.filter(s => !s.id);
    const scheduleIdsToKeep = schedulesToUpdate.map(s => s.id);

    // Delete schedules that are no longer present
    const { error: deleteError } = await supabase
        .from('offering_schedules')
        .delete()
        .eq('offering_id', offeringId)
        .not('id', 'in', `(${scheduleIdsToKeep.join(',')})`);
    
    if (deleteError && scheduleIdsToKeep.length > 0) console.error("Error deleting old schedules:", deleteError.message);


    // Update existing schedules
    if (schedulesToUpdate.length > 0) {
        const updates = schedulesToUpdate.map(async (s) => {
            const { id, ...updateData } = s;
            return supabase
                .from('offering_schedules')
                .update({ ...updateData, event_date: s.event_date?.toISOString(), prices: s.prices })
                .eq('id', s.id!);
        });
        const results = await Promise.all(updates);
        results.forEach(res => {
            if (res.error) console.error("Error updating a schedule:", res.error.message);
        });
    }

    // Create new schedules
    if (schedulesToCreate.length > 0) {
        const creates = schedulesToCreate.map(s => ({
            ...s,
            offering_id: offeringId,
            user_id: user.id,
            event_date: s.event_date?.toISOString(),
            prices: s.prices,
        }));
        const { error: createError } = await supabase.from('offering_schedules').insert(creates);
        if (createError) console.error("Error creating new schedules:", createError.message);
    }
    
    revalidatePath('/offerings');
    return getOffering(offeringId).then(o => o!);
}

/**
 * Deletes an offering for the currently authenticated user, including its media from storage.
 * The database will cascade delete schedules.
 */
export async function deleteOffering(offeringId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const bucketName = 'Alma';
    const folderPath = `${user.id}/offerings/${offeringId}`;

    const { data: files, error: listError } = await supabase.storage.from(bucketName).list(folderPath);

    if (listError) {
        console.error('Error listing files for deletion:', listError.message);
    } else if (files && files.length > 0) {
        const filePaths = files.map(file => `${folderPath}/${file.name}`);
        const { error: removeError } = await supabase.storage.from(bucketName).remove(filePaths);
        if (removeError) {
            console.error('Error deleting files from storage:', removeError.message);
        }
    }

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
 * Uploads a single media file for an offering.
 * @param {string} offeringId - The ID of the offering.
 * @param {FormData} formData - Must contain 'file' and 'description'.
 * @returns {Promise<OfferingMedia>} The newly created media record.
 */
export async function uploadSingleOfferingMedia(offeringId: string, formData: FormData): Promise<OfferingMedia> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;

    if (!file) throw new Error('No file provided for upload.');

    const bucketName = 'Alma';
    const filePath = `${user.id}/offerings/${offeringId}/${crypto.randomUUID()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: false });

    if (uploadError) {
        console.error('Error uploading single file:', uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    const mediaRecord = {
        offering_id: offeringId,
        user_id: user.id,
        media_url: publicUrl,
        media_type: file.type,
        description: description,
    };
    
    const { data: newMedia, error: dbError } = await supabase
        .from('offering_media')
        .insert(mediaRecord)
        .select()
        .single();
    
    if (dbError) {
        console.error('Error saving single media record:', dbError);
        // Attempt to clean up storage if DB insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save media information to the database.');
    }
    
    revalidatePath('/offerings');
    return newMedia;
}


/**
 * Deletes a specific media item for an offering from both DB and storage.
 * @param {string} mediaId - The ID of the media to delete.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function deleteOfferingMedia(mediaId: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: media, error: fetchError } = await supabase
        .from('offering_media')
        .select('media_url, user_id')
        .eq('id', mediaId)
        .single();
    
    if (fetchError || !media) {
        console.error('Error fetching media for deletion:', fetchError);
        throw new Error('Could not find the media to delete.');
    }
    
    if (media.user_id !== user.id) {
        throw new Error("You don't have permission to delete this media.");
    }

    const bucketName = 'Alma';
    const filePath = media.media_url.split(`/${bucketName}/`).pop();

    if (filePath) {
        const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

        if (storageError) {
            console.error('Error deleting file from storage:', storageError.message);
            // We will proceed even if storage deletion fails, to remove the DB record.
        }
    }
    
    const { error: dbError } = await supabase
        .from('offering_media')
        .delete()
        .eq('id', mediaId);

    if (dbError) {
        console.error('Error deleting media record:', dbError);
        throw new Error('Could not delete media record.');
    }

    revalidatePath('/offerings');
    return { message: 'Media deleted successfully.' };
}


/**
 * Invokes the Genkit translation flow.
 * @param {TranslateInput} input The text and target language for translation.
 * @returns {Promise<TranslateOutput>} The translated text.
 */
export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
    try {
        const result = await translateFlow(input);
        return result;
    } catch (error: any) {
        console.error("Translation action failed:", error);
        throw new Error("Failed to translate the text. Please try again.");
    }
}

/**
 * Invokes the Genkit content generation flow.
 * @param {GenerateContentInput} input The offering ID.
 * @returns {Promise<GenerateContentOutput>} The generated content.
 */
export async function generateContentForOffering(input: GenerateContentInput): Promise<GenerateContentOutput> {
    return genContentFlow(input);
}


/**
 * Invokes the Genkit creative generation flow.
 * @param {GenerateCreativeInput} input The offering ID and creative type.
 * @returns {Promise<GenerateCreativeOutput>} The generated creative.
 */
export async function generateCreativeForOffering(input: GenerateCreativeInput): Promise<GenerateCreativeOutput> {
    try {
        const result = await genCreativeFlow(input);
        return result;
    } catch (error: any) {
        console.error("Creative generation action failed:", error);
        throw new Error("Failed to generate creative. Please try again.");
    }
}

type SaveContentInput = {
    offeringId: string;
    contentBody: { primary: string | null; secondary: string | null; } | null;
    imageUrl: string | null;
    carouselSlides: CarouselSlide[] | null;
    videoUrl: string | null;
    landingPageHtml: string | null;
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    mediaPlanItemId?: string | null;
};

/**
 * Invokes the Genkit flow to generate an offering draft.
 * @param {GenerateOfferingDraftInput} input The user's prompt for the new offering.
 * @returns {Promise<OfferingDraft>} The AI-generated draft.
 */
export async function generateOfferingDraft(input: GenerateOfferingDraftInput): Promise<OfferingDraft> {
    const result = await genOfferingDraftFlow(input);
    return result;
}

/**
 * Invokes the Genkit flow to generate an image description.
 * @param {GenerateImageDescriptionInput} input The image data URI and optional context.
 * @returns {Promise<GenerateImageDescriptionOutput>} The AI-generated description.
 */
export async function generateImageDescription(input: GenerateImageDescriptionInput): Promise<GenerateImageDescriptionOutput> {
    return genImageDescFlow(input);
}


/**
 * Invokes the Genkit flow to develop a value content block.
 * @param {GenerateValueContentInput} input The context and concept for the content.
 * @returns {Promise<GenerateValueContentOutput>} The developed content.
 */
export async function generateValueContent(input: GenerateValueContentInput): Promise<GenerateValueContentOutput> {
    return genValueContentFlow(input);
}