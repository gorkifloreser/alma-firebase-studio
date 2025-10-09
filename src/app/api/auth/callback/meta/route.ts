
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
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}&access_token=${access_token}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        console.log('[META AUTH] Step 3 Response:', JSON.stringify(pagesData, null, 2));
        if (pagesData.error) throw new Error(`Fetching pages error: ${pagesData.error.message}`);

        const socialConnections: any[] = [];

        if (pagesData.data && pagesData.data.length > 0) {
            pagesData.data.forEach((page: any) => {
                socialConnections.push({
                    user_id: user.id,
                    provider: 'meta',
                    access_token: page.access_token,
                    expires_at: expiresAt.toISOString(),
                    account_id: page.instagram_business_account?.id || page.id,
                    instagram_account_id: page.instagram_business_account?.id || null,
                    account_name: page.instagram_business_account?.username || page.name,
                    account_picture_url: page.instagram_business_account?.profile_picture_url || page.picture?.data?.url || null,
                    is_active: false,
                });
            });
            console.log(`[META AUTH] Step 3 Success: Found ${socialConnections.length} Facebook/Instagram accounts.`);
        } else {
             console.log('[META AUTH] Step 3: No Facebook Pages found.');
        }

        // // Step 4: Get WhatsApp Business Accounts (COMMENTED OUT)
        // console.log('[META AUTH] Step 4: Fetching WhatsApp Business accounts...');
        // const wabaUrl = `https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${access_token}`;
        // const wabaRes = await fetch(wabaUrl);
        // const wabaData = await wabaRes.json();
        // console.log('[META AUTH] Step 4 Response:', JSON.stringify(wabaData, null, 2));

        // if (wabaData.error) throw new Error(`Fetching WhatsApp accounts error: ${wabaData.error.message}`);

        // if (wabaData.data && wabaData.data.length > 0) {
        //     for (const waba of wabaData.data) {
        //         console.log(`[META AUTH] Step 4.1: Fetching phone numbers for WABA ID ${waba.id}`);
        //         const phonesUrl = `https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?access_token=${access_token}`;
        //         const phonesRes = await fetch(phonesUrl);
        //         const phonesData = await phonesRes.json();
        //         console.log(`[META AUTH] Step 4.1 Response for ${waba.id}:`, JSON.stringify(phonesData, null, 2));
                
        //         if (phonesData.data) {
        //             phonesData.data.forEach((phone: any) => {
        //                  socialConnections.push({
        //                     user_id: user.id,
        //                     provider: 'whatsapp',
        //                     access_token: access_token, // Use the user's long-lived token for WhatsApp
        //                     expires_at: expiresAt.toISOString(),
        //                     account_id: phone.id, // Phone Number ID
        //                     account_name: phone.display_phone_number,
        //                     account_picture_url: null, // No picture for phone numbers
        //                     is_active: false,
        //                 });
        //             });
        //         }
        //     }
        //     console.log(`[META AUTH] Step 4 Success: Processed WhatsApp numbers.`);
        // } else {
        //     console.log('[META AUTH] Step 4: No WhatsApp Business Accounts found.');
        // }
        
        if (socialConnections.length === 0) {
            throw new Error('No social accounts (Instagram or Facebook) found to connect.');
        }

        // Step 5: Determine which accounts to set as active
        console.log('[META AUTH] Step 5: Determining which accounts to activate...');
        const firstIgIndex = socialConnections.findIndex(acc => acc.provider === 'meta' && acc.instagram_account_id);
        if (firstIgIndex !== -1) {
            socialConnections[firstIgIndex].is_active = true;
            console.log(`[META AUTH] Step 5: Activating Meta account with Instagram: ${socialConnections[firstIgIndex].account_name}`);
        } else if (socialConnections.some(acc => acc.provider === 'meta')) {
            const firstMetaIndex = socialConnections.findIndex(acc => acc.provider === 'meta');
            socialConnections[firstMetaIndex].is_active = true;
            console.log(`[META AUTH] Step 5: No Instagram account found. Activating first Facebook page: ${socialConnections[firstMetaIndex].account_name}`);
        }
        
        // const firstWaIndex = socialConnections.findIndex(acc => acc.provider === 'whatsapp');
        // if (firstWaIndex !== -1) {
        //     socialConnections[firstWaIndex].is_active = true;
        //     console.log(`[META AUTH] Step 5: Activating WhatsApp number: ${socialConnections[firstWaIndex].account_name}`);
        // }

        console.log('[META AUTH] Step 6: Final records to be upserted:', JSON.stringify(socialConnections, null, 2));

        // Step 7: Perform an upsert operation
        console.log(`[META AUTH] Step 7: Upserting accounts into the database...`);
        const { error: dbError } = await supabase
            .from('social_connections')
            .upsert(socialConnections, { onConflict: 'user_id, account_id, provider' });
        
        if (dbError) {
            console.error('[META AUTH] Database upsert error:', dbError);
            throw new Error(`Database error while saving connections: ${dbError.message}`);
        }
        
        console.log('[META AUTH] Step 7: Successfully connected and saved account information.');
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
