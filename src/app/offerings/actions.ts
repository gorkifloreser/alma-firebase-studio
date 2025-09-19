

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateFlow, TranslateInput, TranslateOutput } from '@/ai/flows/translate-flow';
import { generateContentForOffering as genContentFlow, GenerateContentInput, GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import { generateCreativeForOffering as genCreativeFlow, GenerateCreativeInput, GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';

export type OfferingMedia = {
    id: string;
    offering_id: string;
    media_url: string;
    media_type: string | null;
    created_at: string;
}

export type Offering = {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    title: { primary: string | null; secondary: string | null };
    description: { primary: string | null; secondary: string | null };
    type: 'Product' | 'Service' | 'Event';
    contextual_notes: string | null;
    price: number | null;
    currency: string | null;
    event_date: string | null; // ISO 8601 string
    duration: string | null;
};

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

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
                created_at
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

/**
 * Creates a new offering for the currently authenticated user.
 * @param {Omit<Offering, 'id' | 'user_id' | 'created_at' | 'updated_at'>} offeringData The data for the new offering.
 * @returns {Promise<OfferingWithMedia>} A promise that resolves to the newly created offering.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function createOffering(offeringData: Omit<Offering, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<OfferingWithMedia> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { offering_media, event_date, updated_at, ...restOfData } = offeringData as any;

  const payload = {
    ...restOfData,
    event_date: offeringData.type === 'Event' && event_date ? new Date(event_date).toISOString() : null,
    price: offeringData.price || null,
    currency: offeringData.price ? (offeringData.currency || 'USD') : null,
    duration: offeringData.type === 'Event' ? offeringData.duration : null,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('offerings')
    .insert(payload)
    .select(`
        *,
        offering_media (
            id,
            offering_id,
            media_url,
            media_type,
            created_at
        )
    `)
    .single();

  if (error) {
    console.error('Error creating offering:', error.message);
    throw new Error('Could not create the offering. Please try again.');
  }

  revalidatePath('/offerings');
  return data as OfferingWithMedia;
}

/**
 * Updates an existing offering for the currently authenticated user.
 * @param {string} offeringId The ID of the offering to update.
 * @param {Partial<Omit<Offering, 'id' | 'user_id' | 'created_at'>>} offeringData The data to update.
 * @returns {Promise<OfferingWithMedia>} A promise that resolves to the updated offering.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function updateOffering(offeringId: string, offeringData: Partial<Omit<Offering, 'id' | 'user_id' | 'created_at'>>): Promise<OfferingWithMedia> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { offering_media, event_date, ...restOfData } = offeringData as any;

    const payload = {
        ...restOfData,
        event_date: offeringData.type === 'Event' && event_date ? new Date(event_date).toISOString() : null,
        price: offeringData.price || null,
        currency: offeringData.price ? (offeringData.currency || 'USD') : null,
        duration: offeringData.type === 'Event' ? offeringData.duration : null,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('offerings')
        .update(payload)
        .eq('id', offeringId)
        .eq('user_id', user.id)
        .select(`
            *,
            offering_media (
                id,
                offering_id,
                media_url,
                media_type,
                created_at
            )
        `)
        .single();

    if (error) {
        console.error('Error updating offering:', error.message);
        throw new Error('Could not update the offering. Please try again.');
    }

    revalidatePath('/offerings');
    return data as OfferingWithMedia;
}

/**
 * Deletes an offering for the currently authenticated user, including its media from storage.
 * @param {string} offeringId The ID of the offering to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
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
 * Uploads media files for a specific offering.
 * @param {string} offeringId - The ID of the offering to associate the media with.
 * @param {FormData} formData - The form data containing the files to upload.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function uploadOfferingMedia(offeringId: string, formData: FormData): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
        return { message: 'No new files to upload.'};
    }

    const bucketName = 'Alma';
    
    const uploadPromises = files.map(async (file) => {
        const filePath = `${user.id}/offerings/${offeringId}/${file.name}`;
        
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error('Error uploading file:', file.name, uploadError);
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

        return {
            offering_id: offeringId,
            user_id: user.id,
            media_url: publicUrl,
            media_type: file.type,
        };
    });

    const mediaRecords = await Promise.all(uploadPromises);

    const { error: dbError } = await supabase.from('offering_media').insert(mediaRecords);

    if (dbError) {
        console.error('Error saving media records:', dbError);
        throw new Error('Could not save media information to the database.');
    }

    revalidatePath('/offerings');
    return { message: 'Media uploaded successfully.' };
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
 * @throws {Error} If the translation fails.
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
 * @throws {Error} If the generation fails.
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
    status: 'draft' | 'approved' | 'scheduled' | 'published';
    sourcePlan?: {
        channel: string;
        format: string;
        copy: string;
        hashtags: string;
        creativePrompt: string;
    } | null;
    mediaPlanItemId?: string;
};

/**
 * Saves or updates content for an offering.
 * @param {SaveContentInput} input - The content data to save.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function saveContent(input: SaveContentInput): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { offeringId, contentBody, imageUrl, carouselSlides, videoUrl, status, sourcePlan, mediaPlanItemId } = input;

    const payload: any = {
        user_id: user.id,
        offering_id: offeringId,
        content_body: contentBody,
        image_url: imageUrl,
        carousel_slides: carouselSlides,
        video_url: videoUrl,
        status: status,
        source_plan: sourcePlan,
    };

    // This is a temporary ID for the media plan item, not a DB ID.
    // In a real app, you might have a proper relation.
    if (sourcePlan?.creativePrompt) { 
      payload.media_plan_item_id = sourcePlan.creativePrompt.slice(0, 36);
    }


    const { error } = await supabase.from('content').insert(payload);

    if (error) {
        console.error('Error saving content:', error.message);
        throw new Error('Could not save the content. Please try again.');
    }
    
    revalidatePath('/calendar');
    return { message: 'Content approved and saved successfully.' };
}
