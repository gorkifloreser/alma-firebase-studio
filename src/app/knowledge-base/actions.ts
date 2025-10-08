'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { askMyDocuments, RagInput, RagOutput } from '@/ai/flows/rag-flow';
import { ai } from '@/ai/genkit';

export type BrandDocument = {
    id: string;
    file_name: string;
    created_at: string;
    document_group_id: string;
    file_path: string;
};

export async function uploadBrandDocument(formData: FormData): Promise<{ message: string, filePath: string, documentGroupId: string }> {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw new Error('User not authenticated');
    const user = authData.user;

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
            is_file_reference: true,
        });
    
     if (dbError) {
        console.error('Error saving document reference to DB:', dbError);
        await supabase.storage.from(bucketName).remove([filePath]);
        throw new Error('Could not save document reference.');
    }

    revalidatePath('/brand');
    return { message: 'Document uploaded successfully!', filePath, documentGroupId };
}

export async function generateAndStoreEmbeddings(chunks: string[], documentGroupId: string): Promise<{ message: string }> {
    console.log(`[generateAndStoreEmbeddings] --- Execution Start ---`);
    console.log(`[generateAndStoreEmbeddings] Received ${chunks?.length ?? 'undefined'} chunks for documentGroupId: ${documentGroupId}`);

    if (!Array.isArray(chunks) || chunks.length === 0) {
        console.error('[generateAndStoreEmbeddings] Error: Chunks are not a valid array or are empty.');
        throw new Error('No valid text chunks provided for embedding.');
    }

    const validChunks = chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
    console.log(`[generateAndStoreEmbeddings] After filtering, there are ${validChunks.length} valid chunks.`);

    if (validChunks.length === 0) {
        console.log('[generateAndStoreEmbeddings] No content to embed after filtering. Exiting.');
        return { message: 'No content to embed after filtering empty chunks.' };
    }
    
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error('[generateAndStoreEmbeddings] Supabase auth error:', authError);
        throw new Error('User not authenticated due to an error.');
    }
    if (!authData?.user) {
        console.error('[generateAndStoreEmbeddings] Error: User not found.');
        throw new Error('User not authenticated.');
    }
    const user = authData.user;
    console.log(`[generateAndStoreEmbeddings] Authenticated user ID: ${user.id}`);

    console.log('[generateAndStoreEmbeddings] Calling AI to generate embeddings with RETRIEVAL_DOCUMENT task type...');
    console.log('[generateAndStoreEmbeddings] Chunks to be embedded:', JSON.stringify(validChunks, null, 2));
    let embeddings;
    try {
        embeddings = await ai.embed({
            model: 'models/text-embedding-004',
            input: validChunks,
            task_type: "RETRIEVAL_DOCUMENT",
        });
    } catch (e) {
        console.error('[generateAndStoreEmbeddings] CRITICAL: ai.embed() call failed.', e);
        throw new Error('Failed to generate embeddings from the AI model.');
    }

    console.log(`[generateAndStoreEmbeddings] Raw embeddings received. Type: ${typeof embeddings}, Length: ${embeddings?.length}`);
    if (embeddings) {
        console.log('[generateAndStoreEmbeddings] First embedding:', JSON.stringify(embeddings[0], null, 2));
    }

    if (!embeddings || embeddings.length !== validChunks.length) {
        console.error(`[generateAndStoreEmbeddings] Mismatch between chunks (${validChunks.length}) and embeddings (${embeddings?.length}).`);
        throw new Error('The number of embeddings returned does not match the number of chunks.');
    }
    console.log(`[generateAndStoreEmbeddings] Successfully generated ${embeddings.length} embeddings.`);

    console.log('[generateAndStoreEmbeddings] --- Preparing records for insertion ---');
    const recordsToInsert = validChunks
        .map((chunk, index) => {
            const embedding = embeddings[index];
            console.log(`[generateAndStoreEmbeddings] Processing chunk ${index}:`);
            console.log(`  - Chunk content: "${chunk.substring(0, 50)}..."`);
            console.log(`  - Embedding type: ${typeof embedding}`);
            console.log(`  - Is embedding an array? ${Array.isArray(embedding)}`);

            if (!Array.isArray(embedding) || embedding.some(isNaN)) {
                console.warn(`[generateAndStoreEmbeddings] SKIPPING chunk at index ${index} due to invalid embedding.`);
                return null;
            }

            const record = {
                user_id: user.id,
                document_group_id: documentGroupId,
                content: chunk,
                embedding: embedding,
                is_file_reference: false,
            };
            console.log(`  - Record created for chunk ${index}.`);
            return record;
        })
        .filter((record): record is NonNullable<typeof record> => record !== null);

    console.log(`[generateAndStoreEmbeddings] Total records to insert: ${recordsToInsert.length}`);

    if (recordsToInsert.length === 0) {
        console.log('[generateAndStoreEmbeddings] No valid records to insert. Exiting.');
        return { message: 'No records to insert after processing and validating embeddings.' };
    }
    
    console.log(`[generateAndStoreEmbeddings] Storing ${recordsToInsert.length} chunks and their embeddings in the database.`);
    
    const { error: insertError } = await supabase
        .from('brand_documents')
        .insert(recordsToInsert);

    if (insertError) {
        console.error(`[generateAndStoreEmbeddings] Error inserting batch records:`, insertError);
        throw new Error(`Failed to store chunks in the knowledge base. DB Error: ${insertError.message}`);
    }

    console.log('[generateAndStoreEmbeddings] --- Execution End ---');
    return { message: `${recordsToInsert.length} document chunks added to knowledge base.` };
}

export async function getBrandDocuments(): Promise<BrandDocument[]> {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return [];
    const user = authData.user;

    const { data, error } = await supabase
        .from('brand_documents')
        .select('id, file_name, created_at, document_group_id, file_path')
        .eq('user_id', user.id)
        .eq('is_file_reference', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching brand documents:', error);
        throw error;
    }
    
    return data as BrandDocument[];
}

export async function deleteBrandDocument(document_group_id: string): Promise<{ message: string }> {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw new Error('User not authenticated');
    const user = authData.user;

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

    const { error: dbError } = await supabase
        .from('brand_documents')
        .delete()
        .eq('document_group_id', document_group_id)
        .eq('user_id', user.id);

    if (dbError) {
        console.error('Error deleting document records:', dbError);
        throw new Error('Could not delete the document records.');
    }

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

export async function askRag(query: string): Promise<RagOutput> {
    if (!query) {
        throw new Error('Query cannot be empty.');
    }
    return await askMyDocuments({ query });
}