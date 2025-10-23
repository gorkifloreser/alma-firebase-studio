import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getMarketAnalysisData, updateMarketAnalysisData } from './actions';
import { MarketAnalysisClientPage } from './_components/MarketAnalysisClientPage';

export default async function MarketAnalysisPage() {
    console.log('[PAGE: MarketAnalysis] --- Server Component Render ---');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('[PAGE: MarketAnalysis] User not authenticated, redirecting to /login.');
        redirect('/login');
    }
    console.log(`[PAGE: MarketAnalysis] User ${user.id} authenticated.`);

    console.log('[PAGE: MarketAnalysis] Fetching initial market analysis data...');
    const initialData = await getMarketAnalysisData();
    console.log('[PAGE: MarketAnalysis] Initial data fetched:', JSON.stringify(initialData, null, 2));

    return (
        <DashboardLayout>
            <Toaster />
            <MarketAnalysisClientPage
                initialData={initialData}
                updateAction={updateMarketAnalysisData}
            />
        </DashboardLayout>
    );
}
