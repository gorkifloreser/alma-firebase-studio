// To run this script:
// 1. Ensure you have ts-node installed: npm install -g ts-node
// 2. Make sure your .env.local file has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// 3. Run from the root of your project: ts-node ./scripts/backfill-media-formats.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// IMPORTANT: This script requires the Service Role Key to bypass RLS for updates.
// It should be stored in your environment variables and NOT committed to git.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Supabase URL or Service Role Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env.local file.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 100;

async function backfillMediaFormats() {
  console.log('Starting backfill process for media_plan_items...');

  let processedCount = 0;
  let hasMore = true;
  let page = 0;

  while (hasMore) {
    const { data: items, error } = await supabase
      .from('media_plan_items')
      .select('id, format')
      .is('media_format', null)
      .not('format', 'is', null)
      .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching items:', error.message);
      return;
    }

    if (items.length === 0) {
      hasMore = false;
      continue;
    }

    console.log(`Found ${items.length} items in batch ${page + 1} to process...`);

    const updates = items.map((item) => {
      const formatString = item.format || '';
      
      // Logic to extract media_format and aspect_ratio from the old `format` string
      let media_format = 'Unknown';
      let aspect_ratio = null;

      const formatParts = formatString.split(' ');

      // Find aspect ratio
      const ratioPart = formatParts.find(part => part.includes(':'));
      if (ratioPart) {
        aspect_ratio = ratioPart;
      }

      // Determine media format
      const lowerCaseFormat = formatString.toLowerCase();
      if (lowerCaseFormat.includes('image')) {
        media_format = 'Image';
      } else if (lowerCaseFormat.includes('video')) {
        media_format = 'Video';
      } else if (lowerCaseFormat.includes('reel') || lowerCaseFormat.includes('short')) {
        media_format = 'Reel';
      } else if (lowerCaseFormat.includes('story')) {
        media_format = 'Story';
      } else if (lowerCaseFormat.includes('carousel')) {
        media_format = 'Carousel';
      } else if (lowerCaseFormat.includes('text post')) {
        media_format = 'Text';
      } else if (lowerCaseFormat.includes('newsletter') || lowerCaseFormat.includes('email')) {
        media_format = 'Email';
      } else if (lowerCaseFormat.includes('blog')) {
        media_format = 'Blog';
      } else if (lowerCaseFormat.includes('landing page')) {
        media_format = 'Landing Page';
      }

      return {
        id: item.id,
        media_format,
        aspect_ratio,
      };
    });

    const { error: updateError } = await supabase
      .from('media_plan_items')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error('Error updating batch:', updateError.message);
      // Stop processing if a batch fails
      return;
    }
    
    processedCount += items.length;
    console.log(`Successfully updated batch ${page + 1}. Total processed: ${processedCount}`);
    page++;
  }

  console.log(`Backfill process complete. Total items updated: ${processedCount}`);
}

backfillMediaFormats();
