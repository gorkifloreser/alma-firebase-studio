

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getFunnels, deleteFunnel, getFunnelPresets, deleteCustomFunnelPreset, getValueStrategies, getAdaptedValueStrategies } from './actions';
import { getViralHooks, createViralHook, updateViralHook, deleteViralHook, rankViralHooks, generateAndGetAdaptedHooks, getAdaptedHooks, createAdaptedHook, updateAdaptedHook, deleteAdaptedHook } from '../viral-hooks/actions';
import { FunnelsClientPage } from './_components/FunnelsClientPage';
import { adaptAndSaveValueStrategies } from '@/ai/flows/adapt-value-strategies-flow';

export default async function AiStrategistPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const offeringIdFilter = typeof searchParams.offeringId === 'string' ? searchParams.offeringId : undefined;

    const [funnels, funnelPresets, viralHooks, adaptedHooks, valueStrategies, adaptedValueStrategies] = await Promise.all([
        getFunnels(offeringIdFilter),
        getFunnelPresets(),
        getViralHooks(),
        getAdaptedHooks(),
        getValueStrategies(),
        getAdaptedValueStrategies(),
    ]);

    return (
        <DashboardLayout>
            <Toaster />
            <FunnelsClientPage
                initialFunnels={funnels}
                initialFunnelPresets={funnelPresets}
                initialViralHooks={viralHooks}
                initialAdaptedHooks={adaptedHooks}
                initialValueStrategies={valueStrategies}
                initialAdaptedValueStrategies={adaptedValueStrategies}
                offeringIdFilter={offeringIdFilter}
                getViralHooks={getViralHooks}
                actions={{
                    getFunnels,
                    deleteFunnel,
                    getFunnelPresets,
                    deleteCustomFunnelPreset,
                    createViralHook,
                    updateViralHook,
                    deleteViralHook,
                    rankViralHooks,
                    generateAndGetAdaptedHooks,
                    getAdaptedHooks,
                    createAdaptedHook,
                    updateAdaptedHook,
                    deleteAdaptedHook,
                    generateAndGetAdaptedValueStrategies: adaptAndSaveValueStrategies,
                }}
            />
        </DashboardLayout>
    );
}
