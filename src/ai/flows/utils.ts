
'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Fetches the core brand context (Brand Heart and Offerings) for the current user.
 * This function is designed to be a safe, reusable utility for AI flows.
 * It includes detailed logging and handles cases where data might be missing.
 *
 * @returns {Promise<{brandHeart: any, offerings: any[]}>} An object containing the brand context.
 * @throws {Error} If the user is not authenticated or if the Brand Heart is not found.
 */
export async function getBrandContext() {
  console.log('[AI_UTIL: getBrandContext] --- Execution Start ---');
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[AI_UTIL: getBrandContext] -- FATAL ERROR -- User not authenticated.');
    throw new Error('User not authenticated.');
  }
  console.log(`[AI_UTIL: getBrandContext] Authenticated user ID: ${user.id}`);

  console.log('[AI_UTIL: getBrandContext] Fetching Brand Heart and Offerings in parallel...');
  const [
    { data: brandHeart, error: brandHeartError },
    { data: offerings, error: offeringsError },
  ] = await Promise.all([
    supabase.from('brand_hearts').select('*').eq('user_id', user.id).single(),
    supabase.from('offerings').select('title, description, type').eq('user_id', user.id).limit(10),
  ]);

  if (brandHeartError) {
    console.error('[AI_UTIL: getBrandContext] -- FATAL ERROR -- fetching Brand Heart:', brandHeartError.message);
    throw new Error(`Could not fetch Brand Heart: ${brandHeartError.message}`);
  }

  if (!brandHeart) {
    console.error('[AI_UTIL: getBrandContext] -- FATAL ERROR -- Brand Heart not found for user.');
    throw new Error('Brand Heart not found. Please define your brand identity first.');
  }
  console.log('[AI_UTIL: getBrandContext] Successfully fetched Brand Heart.');

  if (offeringsError) {
    console.warn('[AI_UTIL: getBrandContext] -- WARNING -- Could not fetch offerings:', offeringsError.message);
    // Non-fatal, we can proceed without offerings if necessary.
  } else {
    console.log(`[AI_UTIL: getBrandContext] Successfully fetched ${offerings?.length || 0} offerings.`);
  }

  console.log('[AI_UTIL: getBrandContext] --- Execution End --- Context fetched successfully.');
  return { brandHeart, offerings: offerings || [] };
}
