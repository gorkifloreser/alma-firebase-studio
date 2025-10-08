'use server';

import { createClient } from '@/lib/supabase/server';
import { ai } from '@/ai/genkit';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// A simple text splitter for chunking
function splitTextIntoChunks(text: string, maxChunkSize = 1500): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// Text sanitization function
const sanitizeText = (text: string): string => {
    return text.replace(/[^a-zA-Z0-9 .,!?'"$%€@()\-]/g, ' ').replace(/\s+/g, ' ').trim();
};

export async function processAndEmbedDocument(filePath: string, documentGroupId: string): Promise<{ message: string }> {
    console.log(`[processAndEmbedDocument] Starting processing for file: ${filePath}`);
    const supabase = createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');
    console.log(`[processAndEmbedDocument] User authenticated: ${user.id}`);

    // 2. Download the file from Supabase Storage
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_NAME!;
    const { data: fileData, error: downloadError } = await supabase.storage.from(bucketName).download(filePath);
    if (downloadError) {
        console.error('[processAndEmbedDocument] Error downloading file:', downloadError);
        throw new Error('Failed to download file from storage.');
    }
    console.log('[processAndEmbedDocument] File downloaded successfully.');

    // 3. Extract text from the file
    let fullText = "";
    if (fileData.type === 'application/pdf') {
        const buffer = await fileData.arrayBuffer();
        const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n\n";
        }
    } else {
        fullText = await fileData.text();
    }
    console.log('[processAndEmbedDocument] Text extracted from file.');

    // 4. Chunk and sanitize the text
    const chunks = splitTextIntoChunks(fullText);
    const sanitizedChunks = chunks.map(sanitizeText).filter(chunk => chunk.length > 0);
    if (sanitizedChunks.length === 0) {
        return { message: 'No content to embed after processing.' };
    }
    console.log(`[processAndEmbedDocument] Text chunked and sanitized into ${sanitizedChunks.length} chunks.`);

    // 5. Generate embeddings
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
    console.log('[processAndEmbedDocument] Embeddings generated successfully.');

    // 6. Prepare and insert records
    const recordsToInsert = sanitizedChunks
        .map((chunk, index) => {
            const embedding = embeddings[index];
            if (!Array.isArray(embedding) || embedding.some(isNaN)) {
                return null;
            }
            return {
                user_id: user.id,
                document_group_id: documentGroupId,
                content: chunk,
                embedding: embedding,
                is_file_reference: false,
            };
        })
        .filter((record): record is NonNullable<typeof record> => record !== null);

    if (recordsToInsert.length === 0) {
        return { message: 'No valid records to insert.' };
    }

    const { error: insertError } = await supabase.from('brand_documents').insert(recordsToInsert);
    if (insertError) {
        console.error('[processAndEmbedDocument] Error inserting records:', insertError);
        throw new Error('Failed to store embeddings in the database.');
    }

    console.log(`[processAndEmbedDocument] Successfully inserted ${recordsToInsert.length} records.`);
    return { message: `${recordsToInsert.length} document chunks embedded and stored successfully.` };
}
