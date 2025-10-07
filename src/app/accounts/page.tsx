
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getUserChannels, updateUserChannels, updateChannelBestPractices, getSocialConnections, getMetaOAuthUrl, disconnectMetaAccount, setActiveConnection } from './actions';
import { AccountsClientPage } from './_components/AccountsClientPage';

export default async function AccountsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [initialUserChannels, socialConnections] = await Promise.all([
        getUserChannels(),
        getSocialConnections()
    ]);
    
    // Check for OAuth callback status
    const callbackStatus = searchParams?.status;
    const callbackMessage = searchParams?.message;

    return (
        <DashboardLayout>
            <Toaster />
            {callbackStatus === 'error' && callbackMessage && (
                 <div className="p-4 m-4 border bg-destructive/10 text-destructive border-destructive/50 rounded-md">
                    <h4 className="font-bold">Connection Failed</h4>
                    <p className="text-sm">{decodeURIComponent(callbackMessage as string)}</p>
                </div>
            )}
            {callbackStatus === 'success' && callbackMessage && (
                 <div className="p-4 m-4 border bg-green-500/10 text-green-700 border-green-500/50 rounded-md">
                    <h4 className="font-bold">Connection Successful</h4>
                    <p className="text-sm">{decodeURIComponent(callbackMessage as string)}</p>
                </div>
            )}
            <AccountsClientPage
                initialUserChannels={initialUserChannels}
                socialConnections={socialConnections}
                updateUserChannelsAction={updateUserChannels}
                updateChannelBestPracticesAction={updateChannelBestPractices}
                getMetaOAuthUrl={getMetaOAuthUrl}
                disconnectMetaAccount={disconnectMetaAccount}
                setActiveConnection={setActiveConnection}
                getSocialConnections={getSocialConnections}
            />
        </DashboardLayout>
    );
}
