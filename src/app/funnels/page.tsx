
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getFunnels, deleteFunnel, getFunnelPresets, deleteCustomFunnelPreset } from './actions';
import { FunnelsClientPage } from './_components/FunnelsClientPage';

export default async function AiStrategistPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const offeringIdFilter = typeof searchParams.offeringId === 'string' ? searchParams.offeringId : undefined;

    const [funnels, funnelPresets] = await Promise.all([
        getFunnels(offeringIdFilter),
        getFunnelPresets(),
    ]);

    return (
        <DashboardLayout>
            <Toaster />
            <FunnelsClientPage
                initialFunnels={funnels}
                initialFunnelPresets={funnelPresets}
                offeringIdFilter={offeringIdFilter}
                actions={{
                    getFunnels,
                    deleteFunnel,
                    getFunnelPresets,
                    deleteCustomFunnelPreset,
                }}
            />
        </DashboardLayout>
    );
}
