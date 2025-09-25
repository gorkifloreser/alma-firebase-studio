
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import type { DocumentInitParameters, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { ai } from '@/ai/genkit';


export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
    document_group_id: string;
    file_path: string;
};


/**
 * Uploads a document to Supabase storage. This action only handles the file upload.
 * Parsing is handled by a separate Edge Function.
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
    
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME!;
    const filePath = `${user.id}/brand_documents/${crypto.randomUUID()}-${documentFile.name}`;

    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, documentFile, { upsert: false });

    if (uploadError) {
        console.error('Error uploading document to storage:', uploadError);
        throw new Error(`Document Storage Failed: ${uploadError.message}`);
    }

    const documentGroupId = crypto.randomUUID();

    const { error: dbError } = await supabase
        .from('brand_documents')
        .insert({
            user_id: user.id,
            file_name: documentFile.name,
            file_path: filePath,
            document_group_id: documentGroupId,
            is_file_reference: true, // Mark this as the main file reference
        });
    
     if (dbError) {
        console.error('Error saving document reference to DB:', dbError);
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document reference.');
    }

    revalidatePath('/brand');
    return { message: 'Document uploaded successfully!' };
}

/**
 * Downloads a document from Supabase storage and parses its content into text chunks.
 * @param {string} filePath - The path of the file in Supabase Storage.
 * @returns {Promise<{ chunks: string[]; document_group_id: string; }>} The text chunks and the document group ID.
 */
export async function parseDocument(filePath: string): Promise<{ chunks: string[]; document_group_id: string; }> {
    console.log('[parseDocument] Starting parsing process for file:', filePath);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: docInfo, error: docError } = await supabase
        .from('brand_documents')
        .select('document_group_id')
        .eq('file_path', filePath)
        .eq('user_id', user.id)
        .single();
    
    if (docError || !docInfo) {
        throw new Error('Could not retrieve document information.');
    }
    
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME!;
    
    console.log('[parseDocument] Downloading file from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError) {
        console.error('Error downloading file for parsing:', downloadError);
        throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    
    if (!fileData) {
        throw new Error("Downloaded file data is null.");
    }
    console.log('[parseDocument] File downloaded successfully.');

    const buffer = await fileData.arrayBuffer();

    console.log('[parseDocument] Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(buffer));
    const pdfDoc: PDFDocumentProxy = await loadingTask.promise;
    console.log(`[parseDocument] PDF loaded with ${pdfDoc.numPages} pages.`);
    let textContent = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const text = await page.getTextContent();
        textContent += (text.items ?? []).map((item: any) => item.str).join(" ") + "\n";
    }

    console.log('[parseDocument] Extracted full text content. Now chunking...');
    
    // Improved regex to split by capitalized titles or multiple newlines
    const chunks = textContent
      .split(/(\n\s*\n)|(^[A-Z\s]{5,}\s*$)/m)
      .map(chunk => chunk?.trim().replace(/\s+/g, ' '))
      .filter(chunk => chunk && chunk.length > 50);

    console.log(`[parseDocument] Text chunked into ${chunks.length} pieces.`);
    chunks.forEach((chunk, index) => {
        console.log(`[parseDocument] Chunk ${index + 1} Preview:`, chunk.substring(0, 100) + '...');
    });
    
    return { chunks, document_group_id: docInfo.document_group_id };
}

/**
 * Generates embeddings for text chunks and stores them in the database.
 * @param {{ chunks: string[]; documentGroupId: string; }} { chunks, documentGroupId } - The text chunks and their associated document group ID.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function generateAndStoreEmbeddings({
  chunks,
  documentGroupId,
}: {
  chunks: string[];
  documentGroupId: string;
}): Promise<{ message: string }> {
    console.log(`[generateAndStoreEmbeddings] Starting embedding process for ${chunks.length} chunks for group ${documentGroupId}.`);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    for (const [index, chunk] of chunks.entries()) {
        console.log(`[generateAndStoreEmbeddings] Generating embedding for chunk ${index + 1}/${chunks.length}...`);

        const embedding = await ai.embed({
            model: 'googleai/text-embedding-preview-0518',
            input: chunk,
        });

        console.log(`[generateAndStoreEmbeddings] Storing chunk ${index + 1} and its embedding in the database.`);
        const { error: insertError } = await supabase
            .from('brand_documents')
            .insert({
                user_id: user.id,
                document_group_id: documentGroupId,
                content: chunk,
                embedding: embedding,
                is_file_reference: false, // These are content chunks, not the file reference
            });

        if (insertError) {
            console.error(`[generateAndStoreEmbeddings] Error inserting chunk ${index + 1}:`, insertError);
            throw new Error(`Failed to store chunk ${index + 1} in the knowledge base.`);
        }
    }

    console.log('[generateAndStoreEmbeddings] All chunks have been processed and stored successfully.');
    return { message: `${chunks.length} document chunks added to knowledge base.` };
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
        .select('id, file_name, created_at, document_group_id, file_path')
        .eq('user_id', user.id)
        .eq('is_file_reference', true) // Only fetch the main file references
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching brand documents:', error);
        throw error;
    }
    
    return data as BrandDocument[];
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
        const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME!;
        const { error: storageError } = await supabase.storage
            .from(bucketName)
            .remove([document.file_path]);
        if (storageError) {
            console.error('Error deleting file from storage:', storageError.message);
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

