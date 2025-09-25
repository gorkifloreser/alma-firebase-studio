
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pdf from 'https://esm.sh/pdf-parse@1.1.1';

const BUCKET_NAME = Deno.env.get('SUPABASE_STORAGE_BUCKET_NAME') || 'Alma';

console.log('Parse Document Edge Function Initialized');

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

    // Parse the PDF buffer
    // pdf-parse is a Node.js library and may not work perfectly in Deno.
    // However, for this simple case, esm.sh's polyfills might make it work.
    const pdfData = await pdf(buffer);
    console.log(`PDF parsed successfully. Extracted ${pdfData.text.length} characters.`);
    console.log('--- PARSED TEXT (First 500 chars) ---');
    console.log(pdfData.text.substring(0, 500) + '...');
    console.log('--- END PARSED TEXT ---');

    // Return the parsed content
    return new Response(JSON.stringify({ content: pdfData.text }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in Edge Function:', error);
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
