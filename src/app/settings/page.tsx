
'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateProfile, getProfile } from './actions';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { languages } from '@/lib/languages';
import type { Profile } from './actions';
import { Avatar } from '@/components/auth/Avatar';
import { User } from '@supabase/supabase-js';

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    // This state will now hold the final URL of the uploaded avatar
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Use keys to force re-render of Select components on state change
    const [primaryKey, setPrimaryKey] = useState(Date.now());
    const [secondaryKey, setSecondaryKey] = useState(Date.now() + 1);

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
            setUser(user);

            setIsLoading(true);
            try {
                const data = await getProfile();
                setProfile(data);
                setAvatarUrl(data?.avatar_url || null); // Initialize avatarUrl from profile
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not fetch your profile.',
                });
            } finally {
                setIsLoading(false);
            }
        };

        checkUserAndFetchData();
    }, [toast]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Append the potentially new avatar URL to the form data
        if (avatarUrl) {
            formData.append('avatar_url', avatarUrl);
        }
        
        startTransition(async () => {
            try {
                const result = await updateProfile(formData);
                setProfile(result.profile); // Update local state with returned profile
                setAvatarUrl(result.profile.avatar_url); // Sync avatarUrl state
                // Update keys to force re-render of Select components
                setPrimaryKey(Date.now());
                setSecondaryKey(Date.now() + 1);
                toast({
                    title: 'Success!',
                    description: result.message,
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Uh oh! Something went wrong.',
                    description: error.message,
                });
            }
        });
    };

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
                        {isLoading ? (
                            <div className="space-y-6 max-w-md">
                                <Skeleton className="h-24 w-24 rounded-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
                                <div>
                                    <Label>Avatar</Label>
                                    <Avatar
                                        userId={user?.id}
                                        url={profile?.avatar_url}
                                        onUpload={setAvatarUrl}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input id="fullName" name="fullName" defaultValue={profile?.full_name || ''} disabled={isPending} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" name="website" defaultValue={profile?.website || ''} disabled={isPending} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="primary-language">Primary Language</Label>
                                    <Select key={primaryKey} name="primaryLanguage" defaultValue={profile?.primary_language || 'en'} disabled={isPending}>
                                        <SelectTrigger id="primary-language">
                                            <SelectValue placeholder="Select primary language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languages.map((lang) => (
                                                <SelectItem key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="secondary-language">Secondary Language (Optional)</Label>
                                    <Select key={secondaryKey} name="secondaryLanguage" defaultValue={profile?.secondary_language || 'none'} disabled={isPending}>
                                        <SelectTrigger id="secondary-language">
                                            <SelectValue placeholder="Select secondary language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {languages.map((lang) => (
                                                <SelectItem key={lang.value} value={lang.value}>
                                                    {lang.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
