
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { ai } from '@/ai/genkit';


export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
};

/**
 * Uploads a document, extracts its content, generates an embedding,
 * and saves everything to the database.
 * @param {FormData} formData The form data containing the file to upload.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If any step of the process fails.
 */
export async function uploadBrandDocument(formData: FormData): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const documentFile = formData.get('document') as File | null;
    if (!documentFile || documentFile.size === 0) {
        throw new Error('No file provided or file is empty.');
    }

    let content: string;
    try {
        const buffer = Buffer.from(await documentFile.arrayBuffer());
        if (documentFile.type === 'application/pdf') {
            const data = await pdf(buffer);
            content = data.text;
        } else if (documentFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const { value } = await mammoth.extractRawText({ buffer });
            content = value;
        } else if (documentFile.type === 'text/plain') {
            content = buffer.toString('utf8');
        } else {
            throw new Error(`Unsupported file type: ${documentFile.type}`);
        }
    } catch (error: any) {
        console.error('Error extracting document content:', error);
        throw new Error('Failed to parse document content.');
    }

    if (!content) {
        throw new Error('Could not extract any text content from the document.');
    }

    // Generate embedding for the content
    const embedding = await ai.embed({
      model: 'googleai/text-embedding-004',
      input: content,
    });


    // Upload the original file to storage
    const bucketName = 'Alma';
    const filePath = `${user.id}/${documentFile.name}`;
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: true });

    if (uploadError) {
        console.error('Error uploading document to storage:', uploadError);
        throw new Error(`Document Storage Failed: ${uploadError.message}`);
    }

    // Save metadata, content, and embedding to the database
    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert({
            user_id: user.id,
            file_name: documentFile.name,
            file_path: filePath,
            content: content,
            embedding: embedding,
        });

    if (dbError) {
        console.error('Error saving document metadata:', dbError);
        // Attempt to delete the file from storage if the DB insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document metadata.');
    }
    
    revalidatePath('/knowledge-base');
    return { message: 'Document processed and added to Knowledge Base!' };
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
 * Deletes a brand document from the database and the corresponding file from storage.
 * @param {string} id The ID of the document to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or the deletion fails.
 */
export async function deleteBrandDocument(id: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get the file_path from the document record
    const { data: document, error: fetchError } = await supabase
        .from('brand_documents')
        .select('file_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
    
    if (fetchError || !document) {
        console.error('Error fetching document for deletion:', fetchError);
        throw new Error('Could not find the document to delete.');
    }

    // Next, delete the file from storage
    if (document.file_path) {
        const { error: storageError } = await supabase.storage
            .from('Alma')
            .remove([document.file_path]);
        if (storageError) {
            console.error('Error deleting file from storage:', storageError);
            // We can choose to continue and still delete the DB record, or stop.
            // For now, we'll log the error and continue.
        }
    }

    // Finally, delete the record from the database
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
