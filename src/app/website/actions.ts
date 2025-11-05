
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Data } from '@measured/puck';

export type WebPage = {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    puck_data: Data | null;
    created_at: string;
    updated_at: string;
};

/**
 * Fetches a single webpage by its slug for the current user.
 */
export async function getPageBySlug(slug: string): Promise<WebPage | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('web_pages')
        .select('*')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching page by slug:', error);
        throw error;
    }

    return data;
}

/**
 * Saves (creates or updates) a webpage's content.
 */
export async function savePage(slug: string, data: Data): Promise<WebPage> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const pageData = {
        user_id: user.id,
        slug,
        title: (data.root as any).title || slug,
        puck_data: data,
        updated_at: new Date().toISOString(),
    };

    const { data: savedPage, error } = await supabase
        .from('web_pages')
        .upsert(pageData, { onConflict: 'user_id, slug' })
        .select()
        .single();

    if (error) {
        console.error('Error saving page:', error);
        throw new Error('Could not save page content.');
    }
    
    // Revalidate the editor page and the public page
    revalidatePath(`/website/edit/${slug}`);
    revalidatePath(`/site/${slug}`);

    return savedPage;
}

/**
 * Fetches a single webpage by its slug for public viewing (no auth required).
 */
export async function getPublicPageBySlug(slug: string): Promise<WebPage | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
        .from('web_pages')
        .select('*')
        .eq('slug', slug)
        // In a multi-tenant app, you would also filter by domain/brand ID here.
        // For now, we assume a single user or that slugs are unique.
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching public page by slug:', error);
        return null;
    }

    return data;
}
