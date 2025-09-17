
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// This is a placeholder type. It will be replaced with the actual Puck type.
type Data = Record<string, any>;


// This function is temporarily disabled.
export async function getLandingPage(funnelId: string) {
    console.log('getLandingPage called with funnelId:', funnelId);
    throw new Error("The visual editor is temporarily unavailable. This function has been disabled.");
}


// This function is temporarily disabled.
export async function saveLandingPage({ stepId, data }: { stepId: string, data: Data }) {
    console.log('saveLandingPage called with stepId:', stepId, 'and data:', data);
    throw new Error("The visual editor is temporarily unavailable. This function has been disabled.");
}

// This function is temporarily disabled.
export async function getPublicLandingPage(path: string) {
    console.log('getPublicLandingPage called with path:', path);
    return null;
}
