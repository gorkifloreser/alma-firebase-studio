
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error_description');

    const redirectUrl = new URL('/accounts', req.nextUrl.origin);

    if (error) {
        console.error('Meta OAuth Error:', error);
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', error);
        return NextResponse.redirect(redirectUrl);
    }
    
    if (!code) {
        console.error('Meta OAuth Error: No code provided.');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', 'Authorization code not found in callback.');
        return NextResponse.redirect(redirectUrl);
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('Meta OAuth Error: User not authenticated in Supabase.');
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', 'You must be logged in to connect an account.');
        return NextResponse.redirect(redirectUrl);
    }

    try {
        // Step 1: Exchange code for a short-lived access token
        const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
        tokenUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/meta`);
        tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
        tokenUrl.searchParams.set('code', code);

        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        
        if (tokenData.error) throw new Error(`Token exchange error: ${tokenData.error.message}`);
        const shortLivedToken = tokenData.access_token;
        
        // Step 2: Exchange short-lived token for a long-lived one
        const longLivedTokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
        longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longLivedTokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
        longLivedTokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
        longLivedTokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

        const longLivedRes = await fetch(longLivedTokenUrl);
        const longLivedData = await longLivedRes.json();
        
        if (longLivedData.error) throw new Error(`Long-lived token error: ${longLivedData.error.message}`);
        
        const { access_token, expires_in } = longLivedData;
        const expires_at = new Date();
        expires_at.setSeconds(expires_at.getSeconds() + expires_in);

        // Step 3: Get user's pages
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${access_token}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        if (pagesData.error) throw new Error(`Fetching pages error: ${pagesData.error.message}`);
        if (!pagesData.data || pagesData.data.length === 0) throw new Error('No Facebook Pages found for this user.');

        // Step 4: Find the first page with a connected Instagram Business Account
        let igAccountId = null;
        let igUsername = null;
        for (const page of pagesData.data) {
            const igUrl = `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${access_token}`;
            const igRes = await fetch(igUrl);
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
                igAccountId = igData.instagram_business_account.id;
                igUsername = igData.instagram_business_account.username;
                break;
            }
        }
        if (!igAccountId) throw new Error('No Instagram Business Account found linked to any of your Facebook Pages.');

        // Step 5: Upsert the connection in Supabase
        const { error: dbError } = await supabase
            .from('social_connections')
            .upsert({
                user_id: user.id,
                provider: 'meta',
                access_token: access_token, // Encrypt this in a real app
                expires_at: expires_at.toISOString(),
                account_id: igAccountId,
                account_name: igUsername,
            }, { onConflict: 'user_id, provider' });
        
        if (dbError) throw new Error(`Database error: ${dbError.message}`);

        redirectUrl.searchParams.set('status', 'success');
        redirectUrl.searchParams.set('message', 'Successfully connected to Meta.');
        return NextResponse.redirect(redirectUrl);

    } catch (e: any) {
        console.error('Meta OAuth Callback Exception:', e);
        redirectUrl.searchParams.set('status', 'error');
        redirectUrl.searchParams.set('message', e.message || 'An unknown error occurred during the authentication process.');
        return NextResponse.redirect(redirectUrl);
    }
}
