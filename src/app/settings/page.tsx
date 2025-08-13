
'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserLanguage, getProfile } from './actions';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';

const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
];

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

export default function SettingsPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
        };

        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const data = await getProfile();
                setProfile(data);
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

        checkUser();
        fetchProfile();
    }, [toast]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        startTransition(async () => {
            try {
                const result = await updateUserLanguage(formData);
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
                        <CardTitle>Language Settings</CardTitle>
                        <CardDescription>
                            Set your primary and an optional secondary language for content generation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-6 max-w-md">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="primary-language">Primary Language</Label>
                                    <Select name="primaryLanguage" defaultValue={profile?.primary_language || 'en'}>
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
                                    <Select name="secondaryLanguage" defaultValue={profile?.secondary_language || 'none'}>
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
