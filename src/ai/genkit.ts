import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { defineAction, action } from '@genkit-ai/core';
import { z } from 'zod';
import { embed } from '@genkit-ai/ai';

export const textEmbedding004 = googleAI.model('text-embedding-004');

export const ai = genkit({
  plugins: [googleAI()],
});


export const embedChunks = action(
  {
    name: 'embedChunks',
    inputSchema: z.string().array(),
    outputSchema: z.any(),
  },
  async (chunks) => {
    if (!chunks || chunks.length === 0) {
      return [];
    }
    
    const embeddingResponse = await embed({
      model: 'models/text-embedding-004',
      content: chunks,
      options: {
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    });

    return embeddingResponse;
  }
);
