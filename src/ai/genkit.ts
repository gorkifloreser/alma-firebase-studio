import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const textEmbedding004 = googleAI('text-embedding-004');

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
