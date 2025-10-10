
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateFlow, TranslateInput, TranslateOutput } from '@/ai/flows/translate-flow';
import { generateAudienceSuggestion as generateAudienceFlow, type GenerateAudienceInput, type GenerateAudienceOutput } from '@/ai/flows/generate-audience-flow';


export type ContactInfo = {
  id: string; // Add a UUID for React keys
  type: 'phone' | 'whatsapp' | 'email' | 'url' | 'location';
  label: string;
  value: string;
  address?: string;
  google_maps_url?: string;
};

export type AudiencePersona = {
    id: string; // client-side UUID
    title: string;
    content: string;
};

/**
 * Defines the shape of the Brand Heart data, including the nested structure
 * for bilingual fields, which aligns with the 'jsonb' columns in the database.
 */
export type BrandHeartData = {
  id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  brand_name: string;
  logo_url: string | null;
  brand_brief: { primary: string | null; secondary: string | null };
  mission: { primary: string | null; secondary: string | null };
  vision: { primary: string | null; secondary: string | null };
  values: { primary: string | null; secondary: string | null };
  tone_of_voice: { primary: string | null; secondary: string | null };
  audience: AudiencePersona[];
  visual_identity: { primary: string | null; secondary: string | null };
  contact_info: ContactInfo[];
};

/**
 * Fetches the brand heart data for the currently authenticated user.
 * Supabase client automatically handles parsing the JSONB columns.
 * @returns {Promise<BrandHeartData | null>} The user's brand heart data or null if not found or not authenticated.
 */
export async function getBrandHeart(): Promise<BrandHeartData | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('getBrandHeart: User not authenticated.');
        return null;
    }

    const { data, error } = await supabase
        .from('brand_hearts')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching brand heart:', error.message);
        return null;
    }
    
    // Add client-side IDs to contact_info if they don't exist
    if (data && data.contact_info) {
        data.contact_info = data.contact_info.map((contact: any) => ({
            ...contact,
            id: contact.id || crypto.randomUUID(),
        }));
    }
    
    // Add client-side IDs to audience personas if they don't exist
    if (data && Array.isArray(data.audience)) {
        data.audience = data.audience.map((persona: any) => ({
            ...persona,
            id: persona.id || crypto.randomUUID(),
        }));
    } else if (data) {
        // If audience is not an array, initialize it as one
        data.audience = [];
    }


    return data as BrandHeartData;
}

/**
 * Creates or updates a user's brand heart data.
 * It reads the flat structure from the form and builds the nested object required by the database.
 * @param {FormData} formData The data from the form submission.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or if the database operation fails.
 */
export async function updateBrandHeart(formData: FormData): Promise<{ message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const currentBrandHeart = await getBrandHeart();
  const logoFile = formData.get('logo') as File | null;
  let newLogoUrl: string | null = currentBrandHeart?.logo_url || null;

  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME;
  if (!bucketName) {
      throw new Error('Storage service is not configured.');
  }

  if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const filePath = `${user.id}/brand_logos/${user.id}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, logoFile, {
            contentType: logoFile.type // Important for SVGs
          });

      if (uploadError) {
          throw new Error(`Logo Upload Failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      newLogoUrl = publicUrl;

      if (currentBrandHeart?.logo_url && currentBrandHeart.logo_url !== newLogoUrl) {
          const oldLogoPath = currentBrandHeart.logo_url.split(`/${bucketName}/`).pop();
          if (oldLogoPath) {
              await supabase.storage.from(bucketName).remove([oldLogoPath]);
          }
      }
  }

  const contactInfoString = formData.get('contact_info') as string;
  const contactInfo = contactInfoString ? JSON.parse(contactInfoString) : undefined;
  
  const audienceString = formData.get('audience') as string;
  const audience = audienceString ? JSON.parse(audienceString) : undefined;


  const payload: { [key: string]: any } = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  const fields: (keyof BrandHeartData)[] = ['brand_name', 'brand_brief', 'mission', 'vision', 'values', 'tone_of_voice', 'visual_identity'];
  fields.forEach(field => {
      if (formData.has(`${field}_primary`)) {
          payload[field] = {
              primary: formData.get(`${field}_primary`) as string,
              secondary: formData.get(`${field}_secondary`) as string | null,
          };
      } else if (formData.has(field)) {
          payload[field] = formData.get(field) as string;
      }
  });

  if (newLogoUrl !== undefined) payload.logo_url = newLogoUrl;
  if (contactInfo !== undefined) payload.contact_info = contactInfo;
  if (audience !== undefined) payload.audience = audience;


  const { error } = await supabase
    .from('brand_hearts')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating brand heart:', error.message);
    throw new Error('Could not update brand heart. Please try again.');
  }

  revalidatePath('/brand');
  return { message: 'Brand Heart updated successfully!' };
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
    } catch (error) {
        console.error("Translation action failed:", error);
        throw new Error("Failed to translate the text. Please try again.");
    }
}

/**
 * Invokes the Genkit flow to generate an audience profile suggestion.
 */
export async function generateAudienceSuggestion(input: GenerateAudienceInput): Promise<GenerateAudienceOutput> {
    try {
        const result = await generateAudienceFlow(input);
        return result;
    } catch (error: any) {
        console.error("Audience suggestion action failed:", error);
        throw new Error(`Failed to generate audience suggestion: ${error.message}`);
    }
}
