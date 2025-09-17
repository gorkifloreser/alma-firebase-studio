
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';

export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
};

/**
 * Uploads a brand document to Supabase Storage and saves its metadata.
 * This version does NOT save the file_path, as the trigger will handle processing.
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
    // The RAG trigger will use this exact path to identify the user and file.
    const filePath = `${user.id}/${documentFile.name}`;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: true }); // Use upsert to allow overwriting

    if (uploadError) {
        console.error('Error uploading document:', uploadError);
        throw new Error(`Document Upload Failed: ${uploadError.message}`);
    }

    // We no longer insert into brand_documents here.
    // The database trigger `handle_storage_object_created` will process the file
    // and insert the content and embedding into the brand_documents table.
    // We just need to revalidate the path so the UI can refetch the documents list.
    
    revalidatePath('/knowledge-base');
    return { message: 'Document uploaded successfully and is being processed.' };
}


/**
 * Fetches the list of processed brand documents for the current user.
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
 * Deletes a brand document from the database.
 * The corresponding file in storage should be deleted via a trigger or manually.
 * @param {string} id The ID of the document to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or the deletion fails.
 */
export async function deleteBrandDocument(id: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // We are simplifying this. In a real-world scenario, you'd also delete
    // the file from storage, perhaps using the file_name and user_id to reconstruct the path.
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

/**
 * Server action to call the RAG AI flow.
 * @param {string} query The user's question.
 * @returns {Promise<RagOutput>} The AI's response.
 */
export async function askRag(query: string): Promise<RagOutput> {
    if (!query) {
        throw new Error('Query cannot be empty.');
    }
    return await askMyDocuments({ query });
}
