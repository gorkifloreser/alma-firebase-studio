
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Use pdf.js, a Deno-compatible library, instead of the Node-specific pdf-parse
import * as pdfjs from 'https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.mjs';

const BUCKET_NAME = Deno.env.get('SUPABASE_STORAGE_BUCKET_NAME') || 'Alma';

console.log('Parse Document Edge Function Initialized (v2)');

// Required for pdf.js to work in a web worker-like environment
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.worker.mjs`;

async function getTextFromPdf(data: ArrayBuffer) {
  const pdf = await pdfjs.getDocument({ data }).promise;
  const numPages = pdf.numPages;
  let fullText = '';
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\\n';
  }
  return fullText;
}


serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { filePath } = await req.json();
    if (!filePath) {
      throw new Error('Missing filePath in request body');
    }
    console.log(`Received request to parse file: ${filePath}`);

    // Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Supabase admin client created.');

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (downloadError) {
      console.error('Error downloading file from storage:', downloadError.message);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    console.log(`File downloaded successfully. Size: ${fileData.size} bytes`);

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();
    console.log('File converted to buffer.');

    // Parse the PDF buffer using pdf.js
    const textContent = await getTextFromPdf(buffer);
    console.log(`PDF parsed successfully. Extracted ${textContent.length} characters.`);
    console.log('--- PARSED TEXT (First 500 chars) ---');
    console.log(textContent.substring(0, 500) + '...');
    console.log('--- END PARSED TEXT ---');

    // Return the parsed content
    return new Response(JSON.stringify({ content: textContent }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in Edge Function:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 500,
    });
  }
});
