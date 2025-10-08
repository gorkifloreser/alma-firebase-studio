
'use server';

import { createClient } from '@/lib/supabase/server';
import { ai } from '@/ai/genkit';

/**
 * Generates embeddings for text chunks and stores them in the database.
 * This function now receives pre-processed text chunks.
 * @param {string[]} chunks The text chunks to be embedded.
 * @param {string} documentGroupId The ID of the document group these chunks belong to.
 * @returns {Promise<{ message: string }>} A success message.
 */
export async function processAndEmbedDocument(chunks: string[], documentGroupId: string): Promise<{ message: string }> {
    console.log(`[processAndEmbedDocument] Starting embedding for documentGroupId: ${documentGroupId}`);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error('No valid text chunks provided for embedding.');
    }
    
    // Sanitize chunks
    const sanitizeText = (text: string): string => text.replace(/[^a-zA-Z0-9 .,!?"'$%€@()\-]/g, ' ').replace(/\s+/g, ' ').trim();
    const sanitizedChunks = chunks.map(sanitizeText).filter(chunk => chunk.length > 0);
    
    if (sanitizedChunks.length === 0) {
        return { message: 'No content to embed after processing.' };
    }
    console.log(`[processAndEmbedDocument] Generating embeddings for ${sanitizedChunks.length} chunks.`);

    let embeddings;
    try {
        embeddings = await ai.embed({
            model: 'googleai/gemini-embedding-001',
            input: sanitizedChunks,
            outputDimensionality: 768,
        });
    } catch (e) {
        console.error('[processAndEmbedDocument] CRITICAL: ai.embed() call failed.', e);
        throw new Error('Failed to generate embeddings from the AI model.');
    }
    
    if (!embeddings || embeddings.length !== sanitizedChunks.length) {
        throw new Error('The number of embeddings returned does not match the number of chunks.');
    }

    const recordsToInsert = sanitizedChunks
        .map((chunk, index) => {
            const embedding = embeddings[index];
            if (!Array.isArray(embedding) || embedding.some(isNaN)) return null;
            return {
                user_id: user.id,
                document_group_id: documentGroupId,
                content: chunk,
                embedding: embedding,
                is_file_reference: false,
            };
        })
        .filter(Boolean);

    if (recordsToInsert.length === 0) {
        return { message: 'No valid records to insert.' };
    }

    const { error: insertError } = await supabase.from('brand_documents').insert(recordsToInsert as any);
    if (insertError) {
        console.error('[processAndEmbedDocument] Error inserting records:', insertError);
        throw new Error('Failed to store embeddings in the database.');
    }
    
    console.log(`[processAndEmbedDocument] Successfully inserted ${recordsToInsert.length} records.`);
    return { message: `${recordsToInsert.length} document chunks embedded and stored successfully.` };
}
