
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

        const foundConnections: any[] = [];
        if (pagesData.data && pagesData.data.length > 0) {
            pagesData.data.forEach((page: any) => {
                // Add Facebook Page connection
                foundConnections.push({
                    provider: 'facebook',
                    account_id: page.id,
                    account_name: page.name,
                    access_token: page.access_token, // This is a page-specific token
                    account_picture_url: page.picture?.data?.url || null,
                    is_active: false,
                });
                // Add Instagram connection if it exists
                if (page.instagram_business_account) {
                    foundConnections.push({
                        provider: 'instagram',
                        account_id: page.instagram_business_account.id,
                        account_name: page.instagram_business_account.username,
                        access_token: page.access_token, // Use the same page token
                        account_picture_url: page.instagram_business_account.profile_picture_url || null,
                        is_active: false,
                    });
                }
            });
             console.log(`[META AUTH] Step 2 Success: Found ${foundConnections.length} potential connections.`);
        } else {
            console.log('[META AUTH] Step 2: No Facebook Pages found.');
        }
        
        if (foundConnections.length === 0) {
            throw new Error('No social accounts (Instagram or Facebook pages) found to connect. Please ensure you have an Instagram Business account linked to a Facebook Page.');
        }

        // Step 3: Update user_channel_settings
        console.log('[META AUTH] Step 3: Upserting connections into user_channel_settings...');
        const providersToUpdate = [...new Set(foundConnections.map(c => c.provider))]; // ['facebook', 'instagram']

        for (const provider of providersToUpdate) {
            const connectionsForProvider = foundConnections.filter(c => c.provider === provider);
            
            // Get the existing settings for this channel
            const { data: channelSetting, error: fetchError } = await supabase
                .from('user_channel_settings')
                .select('id, connections')
                .eq('user_id', user.id)
                .eq('channel_name', provider)
                .single();

            if (fetchError || !channelSetting) {
                console.warn(`[META AUTH] No channel setting found for provider '${provider}'. Skipping update for this provider.`);
                continue;
            }

            let existingConnections = (channelSetting.connections || []) as any[];
            let newConnections = [...existingConnections];
            let madeChanges = false;
            let firstNewConnection = true;

            connectionsForProvider.forEach(newConn => {
                const existingIndex = newConnections.findIndex(c => c.account_id === newConn.account_id);
                if (existingIndex > -1) {
                    // Update existing connection
                    newConnections[existingIndex] = { ...newConnections[existingIndex], ...newConn };
                } else {
                    // Add new connection
                    newConnections.push(newConn);
                }
                madeChanges = true;
            });
            
            // Set the first IG account as active if it's the first time connecting
            const hasActiveConnection = newConnections.some(c => c.is_active);
            if (!hasActiveConnection && newConnections.length > 0) {
                newConnections[0].is_active = true;
            }

            if (madeChanges) {
                 const { error: updateError } = await supabase
                    .from('user_channel_settings')
                    .update({ connections: newConnections })
                    .eq('id', channelSetting.id);

                if (updateError) {
                    console.error(`[META AUTH] Step 3 FAILED for provider '${provider}':`, updateError);
                    throw new Error(`Failed to save ${provider} connections: ${updateError.message}`);
                }
                console.log(`[META AUTH] Step 3 Success for provider '${provider}'.`);
            }
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

    