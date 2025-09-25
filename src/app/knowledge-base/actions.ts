
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';
import { ai } from '@/ai/genkit';
import pdf from 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js';

export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
    document_group_id: string;
};

// Helper function to split text into chunks
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.slice(i, end));
        i = end - overlap;
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
    console.log('[Knowledge Base Action] Starting document upload process...');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const documentFile = formData.get('document') as File | null;
    if (!documentFile || documentFile.size === 0) {
        console.error('[Knowledge Base Action] Error: No file provided or file is empty.');
        throw new Error('No file provided or file is empty.');
    }
    
    console.log(`[Knowledge Base Action] STEP 1: Received file: ${documentFile.name}, Type: ${documentFile.type}, Size: ${documentFile.size} bytes`);


    let content: string;
    try {
        console.log('[Knowledge Base Action] STEP 2: Converting file to buffer...');
        const buffer = Buffer.from(await documentFile.arrayBuffer());
        console.log(`[Knowledge Base Action] STEP 3: File converted to buffer of length ${buffer.length}.`);

        if (documentFile.type === 'application/pdf') {
            console.log('[Knowledge Base Action] STEP 4: Preparing to parse PDF...');
            const data = await pdf(buffer);
            console.log('[Knowledge Base Action] STEP 5: PDF parsing complete.');
            content = data.text;
        } else if (documentFile.type === 'text/plain') {
            console.log('[Knowledge Base Action] STEP 4: Parsing TXT...');
            content = buffer.toString('utf8');
            console.log('[Knowledge Base Action] STEP 5: TXT parsing complete.');
        } else {
            console.error(`[Knowledge Base Action] Unsupported file type: ${documentFile.type}`);
            throw new Error(`Unsupported file type: ${documentFile.type}. DOCX is not currently supported.`);
        }
    } catch (error: any) {
        console.error('[Knowledge Base Action] CRITICAL ERROR extracting document content:', error);
        throw new Error('Failed to parse document content.');
    }

    if (!content) {
        console.error('[Knowledge Base Action] Error: Could not extract any text content from the document.');
        throw new Error('Could not extract any text content from the document.');
    }
    
    console.log(`[Knowledge Base Action] STEP 6: Successfully extracted content. Length: ${content.length} characters.`);


    // Split content into chunks
    const chunks = chunkText(content);
    const documentGroupId = crypto.randomUUID();
    console.log(`[Knowledge Base Action] STEP 7: Split content into ${chunks.length} chunks.`);


    // Generate embeddings for each chunk
    console.log('[Knowledge Base Action] STEP 8: Generating embeddings for chunks...');
    const embeddings = await Promise.all(
      chunks.map(chunk => ai.embed({
        model: 'googleai/text-embedding-preview-0518',
        input: chunk,
      }))
    );
    console.log('[Knowledge Base Action] STEP 9: Embeddings generated successfully.');

    // Upload the original file to storage
    const bucketName = 'Alma';
    const filePath = `${user.id}/${documentFile.name}`;
    console.log(`[Knowledge Base Action] STEP 10: Uploading original file to storage at: ${bucketName}/${filePath}`);
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: true });

    if (uploadError) {
        console.error('[Knowledge Base Action] Error uploading document to storage:', uploadError);
        throw new Error(`Document Storage Failed: ${uploadError.message}`);
    }
    console.log('[Knowledge Base Action] STEP 11: File uploaded to storage successfully.');


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
    console.log(`[Knowledge Base Action] STEP 12: Inserting ${recordsToInsert.length} records into the database...`);
    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert(recordsToInsert);

    if (dbError) {
        console.error('[Knowledge Base Action] Error saving document chunks to DB:', dbError);
        // Attempt to delete the file from storage if the DB insert fails
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document chunks.');
    }
    
    console.log('[Knowledge Base Action] FINAL STEP: Document processing complete.');
    revalidatePath('/knowledge-base');
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

    // This query is simplified. A more robust query would use `DISTINCT ON`
    // to get the latest created_at for each file_name/group.
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
        const { error: storageError } = await supabase.storage
            .from('Alma')
            .remove([document.file_path]);
        if (storageError) {
            console.error('Error deleting file from storage:', storageError.message);
            // We can choose to continue or stop. In this case, we'll log the error but consider the primary (DB) deletion successful.
        }
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
