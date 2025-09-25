
'use server';

/**
 * @fileOverview A RAG (Retrieval-Augmented Generation) flow to answer questions
 * based on the user's uploaded brand documents.
 */

import { ai } from '@/ai/genkit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'genkit';

// Define the input and output schemas for the RAG flow.
const RagInputSchema = z.object({
  query: z.string().describe('The question to ask the knowledge base.'),
});
export type RagInput = z.infer<typeof RagInputSchema>;

const RagOutputSchema = z.object({
  response: z.string().describe('The answer from the knowledge base.'),
});
export type RagOutput = z.infer<typeof RagOutputSchema>;

// Define the prompt that will be sent to the LLM.
const ragPrompt = ai.definePrompt({
  name: 'ragPrompt',
  input: {
    schema: z.object({
      query: z.string(),
      context: z.string(),
    }),
  },
  prompt: `You are a helpful assistant for a user's brand.
  Answer the user's QUESTION based on the provided CONTEXT.
  If the context does not contain the answer, state that you don't have enough information.

  CONTEXT:
  {{context}}

  QUESTION:
  {{query}}

  ANSWER:
  `,
});

/**
 * Main exported function to be called by the UI.
 * It orchestrates the RAG process.
 * @param {RagInput} input - The user's query.
 * @returns {Promise<RagOutput>} The AI-generated response.
 */
export async function askMyDocuments(input: RagInput): Promise<RagOutput> {
  return ragFlow(input);
}

const ragFlow = ai.defineFlow(
  {
    name: 'ragFlow',
    inputSchema: RagInputSchema,
    outputSchema: RagOutputSchema,
  },
  async ({ query }) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    // 1. Generate an embedding for the user's query.
    const embedding = await ai.embed({
      model: 'googleai/text-embedding-preview-0518',
      input: query,
    });

    // 2. Query the database to find relevant document chunks.
    const { data: documents, error: matchError } = await supabase.rpc(
      'match_brand_documents',
      {
        query_embedding: embedding,
        match_threshold: 0.7, // Adjust this threshold as needed
        match_count: 5,
        p_user_id: user.id,
      }
    );

    if (matchError) {
      console.error('Error matching documents:', matchError);
      throw new Error('Could not search knowledge base.');
    }

    const context = documents.map((d: any) => d.content).join('\n\n');

    // 3. Generate a response using the LLM with the retrieved context.
    const { output } = await ragPrompt({ query, context });

    if (!output) {
      throw new Error('The AI model did not return a response.');
    }

    return { response: output };
  }
);
