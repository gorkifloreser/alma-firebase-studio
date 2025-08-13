
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserLanguage } from './actions';

const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
];

export default async function SettingsPage() {
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //     redirect('/login');
    // }

    // const { data: profile } = await supabase
    //     .from('profiles')
    //     .select('primary_language, secondary_language')
    //     .eq('id', user.id)
    //     .single();
    
    // This is a hardcoded user ID and profile for development purposes.
    // TODO: Remove this hardcoded data and re-enable user checks before production.
    const profile = { primary_language: 'en', secondary_language: 'es' };


    return (
        <DashboardLayout>
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
                        <form action={updateUserLanguage} className="space-y-6 max-w-md">
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
                                    </Trigger>
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
                            <Button type="submit">Save Changes</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
