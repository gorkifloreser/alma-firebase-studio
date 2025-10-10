
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    console.log('[META AUTH] Callback initiated.');
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error_description');

    const redirectUrl = new URL('/brand?tab=accounts', req.nextUrl.origin);

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
    console.log('[META AUTH] Received authorization code.');

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
        // Step 1: Exchange code for a long-lived user access token
        console.log('[META AUTH] Step 1: Exchanging code for long-lived user token...');
        const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
        tokenUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/meta`);
        tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
        tokenUrl.searchParams.set('code', code);
        
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Token exchange error: ${tokenData.error.message}`);
        const longLivedUserToken = tokenData.access_token;
        console.log('[META AUTH] Step 1 Success: Received long-lived user token.');

        // Step 2: Get user's pages and their connected Instagram accounts
        console.log('[META AUTH] Step 2: Fetching user\'s pages and linked IG accounts...');
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}&access_token=${longLivedUserToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        if (pagesData.error) throw new Error(`Fetching pages error: ${pagesData.error.message}`);
        
        let facebookConnections: any[] = [];
        let instagramConnections: any[] = [];

        if (pagesData.data && pagesData.data.length > 0) {
            pagesData.data.forEach((page: any) => {
                // Add Facebook Page connection
                facebookConnections.push({
                    provider: 'facebook',
                    account_id: page.id,
                    account_name: page.name,
                    access_token: page.access_token,
                    account_picture_url: page.picture?.data?.url || null,
                    is_active: false,
                });
                // Add Instagram connection if it exists
                if (page.instagram_business_account) {
                    instagramConnections.push({
                        provider: 'instagram',
                        account_id: page.instagram_business_account.id,
                        account_name: page.instagram_business_account.username,
                        access_token: page.access_token,
                        account_picture_url: page.instagram_business_account.profile_picture_url || null,
                        is_active: false,
                        instagram_account_id: page.instagram_business_account.id,
                    });
                }
            });
             console.log(`[META AUTH] Step 2 Success: Found ${facebookConnections.length} FB pages and ${instagramConnections.length} IG accounts.`);
        } else {
            console.log('[META AUTH] Step 2: No Facebook Pages found.');
        }

        // Set the first found account of each type to active
        if (facebookConnections.length > 0) facebookConnections[0].is_active = true;
        if (instagramConnections.length > 0) instagramConnections[0].is_active = true;

        // Step 3: Update user_channel_settings with the new connections JSONB
        if (facebookConnections.length > 0) {
            const { error: fbError } = await supabase
                .from('user_channel_settings')
                .update({ connections: facebookConnections })
                .eq('user_id', user.id)
                .eq('channel_name', 'facebook');
            if (fbError) throw new Error(`Failed to save Facebook connections: ${fbError.message}`);
            console.log('[META AUTH] Step 3: Successfully updated Facebook channel settings.');
        }
        
        if (instagramConnections.length > 0) {
             const { error: igError } = await supabase
                .from('user_channel_settings')
                .update({ connections: instagramConnections })
                .eq('user_id', user.id)
                .eq('channel_name', 'instagram');
            if (igError) throw new Error(`Failed to save Instagram connections: ${igError.message}`);
             console.log('[META AUTH] Step 3: Successfully updated Instagram channel settings.');
        }
        
        if (facebookConnections.length === 0 && instagramConnections.length === 0) {
             throw new Error('No social accounts (Instagram or Facebook pages) found to connect. Please ensure you have an Instagram Business account linked to a Facebook Page.');
        }

        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('message', 'Successfully connected your Meta account(s).');
        return NextResponse.redirect(redirectUrl);

    } catch (e: any) {
        console.error('[META AUTH] FATAL ERROR in callback workflow:', e);
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', e.message || 'An unknown error occurred during the authentication process.');
        return NextResponse.redirect(redirectUrl);
    }
}
