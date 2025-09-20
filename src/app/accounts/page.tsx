
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getUserChannels, updateUserChannels, updateChannelBestPractices } from './actions';
import { AccountsClientPage } from './_components/AccountsClientPage';

export default async function AccountsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const initialUserChannels = await getUserChannels();

    return (
        <DashboardLayout>
            <Toaster />
            <AccountsClientPage
                initialUserChannels={initialUserChannels}
                updateUserChannelsAction={updateUserChannels}
                updateChannelBestPracticesAction={updateChannelBestPractices}
            />
        </DashboardLayout>
    );
}
