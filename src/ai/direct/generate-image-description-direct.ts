
'use server';

import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// Ensure your API key is securely loaded from environment variables
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('CRITICAL ERROR: GEMINI_API_KEY is not set in environment variables.');
  throw new Error('Server configuration error: GEMINI_API_KEY is missing.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

function dataUriToGenerativePart(uri: string): Part {
    const match = uri.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URI format.');
    }
    const [, mimeType, base64Data] = match;
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
}

export interface GenerateImageDescriptionDirectInput {
  imageDataUri: string;
  contextTitle?: string;
  contextDescription?: string;
}

export interface GenerateImageDescriptionDirectOutput {
  description: string;
}

export async function generateImageDescriptionDirect(input: GenerateImageDescriptionDirectInput): Promise<GenerateImageDescriptionDirectOutput> {
    console.log('Direct AI Action: Generating image description started.');
    try {
        const imagePart = dataUriToGenerativePart(input.imageDataUri);
        
        const prompt = `Analyze the following image and generate a short, descriptive caption for it.
This description will be used as alt-text and as context for other AI models, so be concise and accurate.
Focus on the main subject and action in the image.

Use the following context about the offering this image is for to inform your description:
- Offering Title: ${input.contextTitle || 'N/A'}
- Offering Description: ${input.contextDescription || 'N/A'}`;

        console.log('Direct AI Action: Calling Gemini Pro Vision API.');
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log('Direct AI Action: Gemini API Response received successfully.');

        return { description: text };

    } catch (error: any) {
        console.error('Direct AI Action Error: Failed to generate image description.', error);
        throw new Error(`Failed to generate description: ${error.message || 'An unknown error occurred.'}`);
    } finally {
        console.log('Direct AI Action: Generating image description finished.');
    }
}
