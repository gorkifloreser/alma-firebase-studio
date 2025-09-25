import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174";

const BUCKET_NAME = "Alma";

console.log("Parse Document Edge Function Initialized");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { filePath } = await req.json();
    if (!filePath) throw new Error("Missing filePath in request body");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (downloadError) throw new Error(downloadError.message);

    const buffer = await fileData.arrayBuffer();

    // Load PDF with pdfjs
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let textContent = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      textContent += text.items.map((item: any) => item.str).join(" ") + "\n";
    }

    return new Response(
      JSON.stringify({ content: textContent }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in Edge Function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
        status: 500,
      },
    );
  }
});
