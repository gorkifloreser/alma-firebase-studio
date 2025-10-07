
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    console.log('[META AUTH] Callback initiated.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error_description');

    const redirectUrl = new URL('/accounts', req.nextUrl.origin);

    if (error) {
        console.error('[META AUTH] OAuth Error received from Meta:', error);
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', error);
        return NextResponse.redirect(redirectUrl);
    }
    
    if (!code) {
        console.error('[META AUTH] OAuth Error: No code provided in callback.');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', 'Authorization code not found in callback.');
        return NextResponse.redirect(redirectUrl);
    }
    console.log('[META AUTH] Received authorization code:', code.substring(0, 15) + '...');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('[META AUTH] OAuth Error: User not authenticated in Supabase.');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', 'You must be logged in to connect an account.');
        return NextResponse.redirect(redirectUrl);
    }
    console.log('[META AUTH] Supabase user authenticated:', user.id);

    try {
        // Step 1: Exchange code for a short-lived access token
        console.log('[META AUTH] Step 1: Exchanging code for short-lived token...');
        const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
        tokenUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/meta`);
        tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
        tokenUrl.searchParams.set('code', code);
        
        console.log('[META AUTH] Step 1: Fetching URL:', tokenUrl.origin + tokenUrl.pathname);
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        
        console.log('[META AUTH] Step 1 Response:', JSON.stringify(tokenData, null, 2));
        if (tokenData.error) throw new Error(`Token exchange error: ${tokenData.error.message}`);
        const shortLivedToken = tokenData.access_token;
        console.log('[META AUTH] Step 1 Success: Extracted short-lived token.');
        
        // Step 2: Exchange short-lived token for a long-lived one
        console.log('[META AUTH] Step 2: Exchanging short-lived token for long-lived token...');
        const longLivedTokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longLivedTokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
        longLivedTokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
        longLivedTokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

        console.log('[META AUTH] Step 2: Fetching URL:', longLivedTokenUrl.origin + longLivedTokenUrl.pathname);
        const longLivedRes = await fetch(longLivedTokenUrl);
        const longLivedData = await longLivedRes.json();
        
        console.log('[META AUTH] Step 2 Response:', JSON.stringify(longLivedData, null, 2));
        if (longLivedData.error) throw new Error(`Long-lived token error: ${longLivedData.error.message}`);
        
        const { access_token, expires_in } = longLivedData;
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (Number(expires_in) || 5184000)); // Default to 60 days
        console.log(`[META AUTH] Step 2 Success: Extracted long-lived token. Expires in: ${expires_in} seconds.`);

        // Step 3: Get user's pages and their connected Instagram accounts
        console.log('[META AUTH] Step 3: Fetching user\'s pages and linked IG accounts...');
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,instagram_business_account{id,username}&access_token=${access_token}`;
        console.log('[META AUTH] Step 3: Requesting pages from:', pagesUrl);
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        console.log('[META AUTH] Step 3 Response:', JSON.stringify(pagesData, null, 2));
        if (pagesData.error) throw new Error(`Fetching pages error: ${pagesData.error.message}`);
        if (!pagesData.data || pagesData.data.length === 0) throw new Error('No Facebook Pages with Instagram accounts found for this user.');
        console.log(`[META AUTH] Step 3 Success: Found ${pagesData.data.length} pages/accounts.`);

        // Step 4: Prepare data for database insertion
        console.log('[META AUTH] Step 4: Preparing records for database...');
        const accountsToUpsert = pagesData.data.map((page: any) => ({
            user_id: user.id,
            provider: 'meta',
            access_token: page.access_token, // Use page-specific token
            expires_at: expiresAt.toISOString(),
            account_id: page.id, // Always the Facebook Page ID
            instagram_account_id: page.instagram_business_account?.id || null, // The linked IG Business Account ID
            account_name: page.instagram_business_account?.username || page.name,
            is_active: false, // Default to inactive
        }));

        if (accountsToUpsert.length === 0) {
            console.error('[META AUTH] Step 4: No accounts could be prepared for saving.');
            throw new Error('No accounts could be prepared for saving.');
        }
        console.log(`[META AUTH] Step 4: Prepared ${accountsToUpsert.length} records.`);

        // Step 5: Determine which account to set as active
        console.log('[META AUTH] Step 5: Determining which account to activate...');
        const firstIgIndex = accountsToUpsert.findIndex((acc: any) => acc.instagram_account_id);
        if (firstIgIndex !== -1) {
            accountsToUpsert[firstIgIndex].is_active = true;
            console.log(`[META AUTH] Step 5: Activating account with Instagram: ${accountsToUpsert[firstIgIndex].account_name}`);
        } else if (accountsToUpsert.length > 0) {
            accountsToUpsert[0].is_active = true; // Fallback to the first page if no IG account is found
            console.log(`[META AUTH] Step 5: No Instagram account found. Activating first Facebook page: ${accountsToUpsert[0].account_name}`);
        }
        
        console.log('[META AUTH] Step 6: Final records to be upserted:', JSON.stringify(accountsToUpsert, null, 2));

        // Step 7: Perform an upsert operation
        console.log(`[META AUTH] Step 7: Upserting accounts into the database...`);
        const { error: dbError } = await supabase
            .from('social_connections')
            .upsert(accountsToUpsert, { onConflict: 'user_id, account_id, provider' }); // Note: updated onConflict key
        
        if (dbError) {
            console.error('[META AUTH] Database upsert error:', dbError);
            throw new Error(`Database error while saving connections: ${dbError.message}`);
        }
        
        console.log('[META AUTH] Step 7: Successfully connected and saved account information.');
        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('message', 'Successfully connected your Meta account.');
        return NextResponse.redirect(redirectUrl);

    } catch (e: any) {
        console.error('[META AUTH] FATAL ERROR in callback workflow:', e);
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', e.message || 'An unknown error occurred during the authentication process.');
        return NextResponse.redirect(redirectUrl);
    }
}
