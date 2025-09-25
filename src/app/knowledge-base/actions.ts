
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
 * Uploads a document, extracts its content, splits it into chunks,
 * generates an embedding for each chunk, and saves everything to the database.
 * @param {FormData} formData The form data containing the file to upload.
 * @returns {Promise<{ message: string }>} A success message.
 * @throws {Error} If any step of the process fails.
 */
export async function uploadBrandDocument(formData: FormData): Promise<{ message: string }> {
    console.log('[RAG Ingestion] Starting document upload process...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const documentFile = formData.get('document') as File | null;
    if (!documentFile || documentFile.size === 0) {
        throw new Error('No file provided or file is empty.');
    }
    
    console.log(`[RAG Ingestion] STEP 1: Received file: ${documentFile.name}, Type: ${documentFile.type}, Size: ${documentFile.size} bytes`);


    let content: string;
    try {
        console.log('[RAG Ingestion] STEP 2: Converting file to buffer...');
        const buffer = Buffer.from(await documentFile.arrayBuffer());
        
        if (documentFile.type === 'application/pdf') {
            console.log('[RAG Ingestion] STEP 3: Parsing PDF...');
            const data = await pdf(buffer);
            content = data.text;
        } else if (documentFile.type === 'text/plain') {
            console.log('[RAG Ingestion] STEP 3: Parsing TXT...');
            content = buffer.toString('utf8');
        } else {
            console.error(`[RAG Ingestion] Unsupported file type: ${documentFile.type}`);
            throw new Error(`Unsupported file type: ${documentFile.type}. Only PDF and TXT are currently supported.`);
        }
    } catch (error: any) {
        console.error('[RAG Ingestion] CRITICAL ERROR extracting document content:', error);
        throw new Error('Failed to parse document content. The file might be corrupted or in an unsupported format.');
    }

    if (!content || !content.trim()) {
        throw new Error('Could not extract any text content from the document.');
    }
    
    console.log(`[RAG Ingestion] STEP 4: Successfully extracted content. Length: ${content.length} characters.`);


    // Split content into chunks
    const chunks = chunkText(content);
    const documentGroupId = crypto.randomUUID();
    console.log(`[RAG Ingestion] STEP 5: Split content into ${chunks.length} chunks.`);


    // Generate embeddings for each chunk
    console.log('[RAG Ingestion] STEP 6: Generating embeddings for chunks...');
    const embeddings = await Promise.all(
      chunks.map(chunk => ai.embed({
        model: 'googleai/text-embedding-preview-0518',
        input: chunk,
      }))
    );
    console.log('[RAG Ingestion] STEP 7: Embeddings generated successfully.');

    // Upload the original file to storage
    const bucketName = 'Alma';
    const filePath = `${user.id}/${documentFile.name}`;
    console.log(`[RAG Ingestion] STEP 8: Uploading original file to storage at: ${bucketName}/${filePath}`);
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: true });

    if (uploadError) {
        console.error('[RAG Ingestion] Error uploading document to storage:', uploadError);
        throw new Error(`Document Storage Failed: ${uploadError.message}`);
    }
    console.log('[RAG Ingestion] STEP 9: File uploaded to storage successfully.');


    // Prepare data for batch insert
    const recordsToInsert = chunks.map((chunk, index) => ({
        user_id: user.id,
        file_name: documentFile.name,
        file_path: filePath,
        content: chunk,
        embedding: embeddings[index],
        document_group_id: documentGroupId,
    }));


    // Save metadata, content, and embedding for each chunk to the database
    console.log(`[RAG Ingestion] STEP 10: Inserting ${recordsToInsert.length} records into the database...`);
    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert(recordsToInsert);

    if (dbError) {
        console.error('[RAG Ingestion] Error saving document chunks to DB:', dbError);
        // Attempt to delete the file from storage if the DB insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document chunks.');
    }
    
    console.log('[RAG Ingestion] FINAL STEP: Document processing complete.');
    revalidatePath('/brand');
    return { message: 'Document processed and added to Knowledge Base!' };
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
    return await askMyDocuments({ query });
}
