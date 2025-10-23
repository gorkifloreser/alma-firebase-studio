
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { MarketAnalysisClientPage } from './_components/MarketAnalysisClientPage';
import { getMarketAnalysisReports } from './actions';

export default async function MarketAnalysisPage() {
    console.log('[PAGE: MarketAnalysis] --- Server Component Render ---');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log('[PAGE: MarketAnalysis] User not authenticated, redirecting to /login.');
        redirect('/login');
    }
    console.log(`[PAGE: MarketAnalysis] User ${user.id} authenticated.`);

    const initialReports = await getMarketAnalysisReports();

    return (
        <DashboardLayout>
            <Toaster />
            <MarketAnalysisClientPage initialReports={initialReports} />
        </DashboardLayout>
    );
}