
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { translateFlow, TranslateInput, TranslateOutput } from '@/ai/flows/translate-flow';

export type ContactInfo = {
  id: string; // Add a UUID for React keys
  type: 'phone' | 'whatsapp' | 'email' | 'url' | 'location';
  label: string;
  value: string;
  address?: string;
  google_maps_url?: string;
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

    return data;
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
  const contactInfo = JSON.parse(contactInfoString || '[]');


  const payload = {
    user_id: user.id,
    brand_name: (formData.get('brand_name') as string) || '',
    logo_url: newLogoUrl,
    brand_brief: {
      primary: (formData.get('brand_brief_primary') as string) || null,
      secondary: (formData.get('brand_brief_secondary') as string) || null,
    },
    mission: {
      primary: (formData.get('mission_primary') as string) || null,
      secondary: (formData.get('mission_secondary') as string) || null,
    },
    vision: {
      primary: (formData.get('vision_primary') as string) || null,
      secondary: (formData.get('vision_secondary') as string) || null,
    },
    values: {
      primary: (formData.get('values_primary') as string) || null,
      secondary: (formData.get('values_secondary') as string) || null,
    },
    tone_of_voice: {
      primary: (formData.get('tone_of_voice_primary') as string) || null,
      secondary: (formData.get('tone_of_voice_secondary') as string) || null,
    },
    visual_identity: {
      primary: (formData.get('visual_identity_primary') as string) || null,
      secondary: (formData.get('visual_identity_secondary') as string) || null,
    },
    contact_info: contactInfo,
    updated_at: new Date().toISOString(),
  };

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
