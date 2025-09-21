

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getProfile } from '@/app/settings/actions';
import { getOfferings, createOffering, updateOffering, deleteOffering, translateText, uploadSingleOfferingMedia, deleteOfferingMedia, generateOfferingDraft } from './actions';
import { getFunnels } from '@/app/funnels/actions';
import { OfferingsClientPage } from './_components/OfferingsClientPage';

export default async function OfferingsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [profile, offerings, funnels] = await Promise.all([
        getProfile(),
        getOfferings(),
        getFunnels(),
    ]);

    return (
        <DashboardLayout>
            <Toaster />
            <OfferingsClientPage
                initialOfferings={offerings}
                initialFunnels={funnels}
                profile={profile}
                actions={{
                    getOfferings,
                    createOffering,
                    updateOffering,
                    deleteOffering,
                    translateText,
                    uploadSingleOfferingMedia,
                    deleteOfferingMedia,
                    generateOfferingDraft
                }}
            />
        </DashboardLayout>
    );
}
