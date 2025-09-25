
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';
import { ai } from '@/ai/genkit';
import pdf from 'pdf-parse';


export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
    document_group_id: string;
};

// Helper function to split text into chunks
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.slice(i, end));
        i = end - overlap > i ? end - overlap : i + 1; // Ensure progress
    }
    return chunks;
}


/**
 * Uploads a document to Supabase storage.
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
    
    // Define the storage path
    const bucketName = 'Alma';
    const filePath = `${user.id}/brand_documents/${documentFile.name}`;

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: true });

    if (uploadError) {
        console.error('Error uploading document to storage:', uploadError);
        throw new Error(`Document Storage Failed: ${uploadError.message}`);
    }

    // Parse the PDF content
    let parsedText = '';
    if (documentFile.type === 'application/pdf') {
        const buffer = Buffer.from(await documentFile.arrayBuffer());
        const pdfData = await pdf(buffer);
        parsedText = pdfData.text;
        console.log('--- PDF PARSE RESULT ---');
        console.log(parsedText.substring(0, 1000) + '...');
        console.log('--- END PARSE RESULT ---');
    } else {
        parsedText = await documentFile.text();
    }


    // We will use a proper UUID for the group id.
    const documentGroupId = crypto.randomUUID();

    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert({
            user_id: user.id,
            file_name: documentFile.name,
            file_path: filePath,
            document_group_id: documentGroupId,
            content: parsedText,
            // embedding is omitted for now
        });
    
     if (dbError) {
        console.error('Error saving document reference to DB:', dbError);
        // Attempt to delete the file from storage if the DB insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document reference.');
    }

    revalidatePath('/brand');
    return { message: 'Document uploaded and parsed successfully!' };
}


/**
 * Fetches the list of processed brand documents for the current user.
 * It groups documents by the document_group_id to show one entry per file.
 * @returns {Promise<BrandDocument[]>} A promise that resolves to an array of unique documents.
 */
export async function getBrandDocuments(): Promise<BrandDocument[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('brand_documents')
        .select('id, file_name, created_at, document_group_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching brand documents:', error);
        throw error;
    }

    // Deduplicate documents based on document_group_id
    const uniqueDocuments = Array.from(new Map(data.map(doc => [doc.document_group_id, doc])).values());
    
    return uniqueDocuments as BrandDocument[];
}

/**
 * Deletes all chunks of a brand document from the database and the corresponding file from storage.
 * @param {string} document_group_id The group ID of the document to delete.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If the user is not authenticated or the deletion fails.
 */
export async function deleteBrandDocument(document_group_id: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get the file_path from one of the document chunks
    const { data: document, error: fetchError } = await supabase
        .from('brand_documents')
        .select('file_path')
        .eq('document_group_id', document_group_id)
        .eq('user_id', user.id)
        .limit(1)
        .single();
    
    if (fetchError || !document) {
        console.error('Error fetching document for deletion:', fetchError);
        throw new Error('Could not find the document to delete.');
    }

    // Next, delete all chunks from the database
    const { error: dbError } = await supabase
        .from('brand_documents')
        .delete()
        .eq('document_group_id', document_group_id)
        .eq('user_id', user.id);

    if (dbError) {
        console.error('Error deleting document records:', dbError);
        throw new Error('Could not delete the document records.');
    }

    // Finally, delete the file from storage
    if (document.file_path) {
        const bucketName = 'Alma';
        const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([document.file_path]);
        if (storageError) {
            console.error('Error deleting file from storage:', storageError.message);
            // We can choose to continue or stop. In this case, we'll log the error but consider the primary (DB) deletion successful.
        }
    }
    
    revalidatePath('/brand');
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
    // The RAG flow might need adjustments now that we are not pre-processing files.
    // For now, it will likely not return useful results until we add the processing step back.
    return await askMyDocuments({ query });
}
