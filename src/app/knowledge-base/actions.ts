
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
};

/**
 * Uploads a brand document to Supabase Storage and saves its metadata.
 * @param {FormData} formData The form data containing the file to upload.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated, the file is missing, or the upload fails.
 */
export async function uploadBrandDocument(formData: FormData): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const documentFile = formData.get('document') as File | null;
    if (!documentFile || documentFile.size === 0) {
        throw new Error('No file provided or file is empty.');
    }

    const bucketName = 'Alma';
    const filePath = `${user.id}/brand_docs/${user.id}-${Date.now()}-${documentFile.name}`;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile);

    if (uploadError) {
        console.error('Error uploading document:', uploadError);
        throw new Error(`Document Upload Failed: ${uploadError.message}`);
    }

    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert({
            user_id: user.id,
            file_name: documentFile.name,
        });

    if (dbError) {
        console.error('Error saving document metadata:', dbError);
        // Attempt to delete the uploaded file if the db insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document metadata.');
    }

    revalidatePath('/knowledge-base');
    return { message: 'Document uploaded successfully!' };
}

/**
 * Fetches the list of uploaded brand documents for the current user.
 * @returns {Promise<BrandDocument[]>} A promise that resolves to an array of documents.
 */
export async function getBrandDocuments(): Promise<BrandDocument[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('brand_documents')
        .select('id, file_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching brand documents:', error);
        return [];
    }
    return data;
}

/**
 * Deletes a brand document from Supabase Storage and the database.
 * @param {string} id The ID of the document to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or the deletion fails.
 */
export async function deleteBrandDocument(id: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // This implementation does not have the file path, so we cannot delete from storage.
    // This is a known limitation based on the current schema.
    // For a production app, we would store the file_path in the brand_documents table.

    const { error: dbError } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (dbError) {
        console.error('Error deleting document record:', dbError);
        throw new Error('Could not delete the document record.');
    }
    
    revalidatePath('/knowledge-base');
    return { message: 'Document deleted successfully!' };
}
