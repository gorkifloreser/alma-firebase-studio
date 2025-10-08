
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getHarvestItems, updateHarvestItemStatus, requestTestimonial, getTestimonials, saveTestimonial, createContentFromTestimonial } from './actions';
import { HarvestCircleClientPage } from './_components/HarvestCircleClientPage';
import { getProfile } from '@/app/settings/actions';
import { getOfferings } from '@/app/offerings/actions';

export default async function HarvestCirclePage() {
    console.log('[HarvestCirclePage - Server] Page rendering started.');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('[HarvestCirclePage - Server] User not authenticated, redirecting to /login.');
        redirect('/login');
    }
    console.log(`[HarvestCirclePage - Server] User ${user.id} authenticated.`);

    console.log('[HarvestCirclePage - Server] Fetching initial data...');
    const [harvestItems, testimonials, profile, offerings] = await Promise.all([
        getHarvestItems(),
        getTestimonials(),
        getProfile(),
        getOfferings(),
    ]);
    console.log(`[HarvestCirclePage - Server] Fetched ${harvestItems.length} harvest items, ${testimonials.length} testimonials, and ${offerings.length} offerings.`);

    return (
        <DashboardLayout>
            <Toaster />
            <HarvestCircleClientPage
                initialHarvestItems={harvestItems}
                initialTestimonials={testimonials}
                initialOfferings={offerings}
                profile={profile}
                actions={{
                    getHarvestItems,
                    updateHarvestItemStatus,
                    requestTestimonial,
                    getTestimonials,
                    saveTestimonial,
                    createContentFromTestimonial,
                }}
            />
        </DashboardLayout>
    );
}
