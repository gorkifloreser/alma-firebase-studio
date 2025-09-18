
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile, updateProfile } from './actions';
import { languages } from '@/lib/languages';
import { SettingsForm } from './_components/SettingsForm';

export default async function SettingsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const profile = await getProfile();

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage your account and language preferences.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                           This information will be used to personalize your experience.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SettingsForm
                            profile={profile}
                            languages={languages}
                            updateProfileAction={updateProfile}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

