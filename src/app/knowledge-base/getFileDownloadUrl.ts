
'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Creates a signed URL to download a file from Supabase storage.
 * @param {string} filePath The path of the file in the storage bucket.
 * @returns {Promise<{ signedUrl: string }>} A promise that resolves to the signed URL.
 * @throws {Error} If the user is not authenticated or the URL creation fails.
 */
export async function getFileDownloadUrl(filePath: string): Promise<{ signedUrl: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME!;
    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60); // URL is valid for 60 seconds

    if (error) {
        console.error('Error creating signed URL:', error);
        throw new Error('Could not create download URL.');
    }

    return { signedUrl: data.signedUrl };
}

  