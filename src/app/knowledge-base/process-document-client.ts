
'use client';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// Set the workerSrc to the local copy.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';


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


/**
 * Parses a document (PDF, TXT, MD) on the client-side and returns text chunks.
 * @param {string} fileUrl The URL of the file to parse.
 * @returns {Promise<string[]>} A promise that resolves to an array of text chunks.
 */
export async function parseDocumentClientSide(fileUrl: string): Promise<string[]> {
    console.log(`[parseDocumentClientSide] Starting processing for file URL: ${fileUrl}`);
    
    // Fetch the file from the provided URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file for parsing: ${response.statusText}`);
    }

    const fileData = await response.blob();
    let fullText = "";

    // Extract text based on file type
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
    
    console.log('[parseDocumentClientSide] Text extracted, now chunking.');
    // Chunk the extracted text
    return splitTextIntoChunks(fullText);
}
