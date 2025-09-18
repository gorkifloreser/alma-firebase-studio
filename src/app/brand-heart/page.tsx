
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { getProfile } from '@/app/settings/actions';
import { getBrandHeart, updateBrandHeart, translateText } from './actions';
import { languages } from '@/lib/languages';
import { BrandHeartForm } from './_components/BrandHeartForm';

export default async function BrandHeartPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [profile, brandHeart] = await Promise.all([
        getProfile(),
        getBrandHeart(),
    ]);

    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Brand Heart</h1>
                    <p className="text-muted-foreground">Define your brand's soul. This is the foundation for all AI content generation.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Core Essence</CardTitle>
                        <CardDescription>
                            Fill in these details to give the AI a deep understanding of your brand.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <BrandHeartForm
                            profile={profile}
                            brandHeart={brandHeart}
                            languageNames={languageNames}
                            updateBrandHeartAction={updateBrandHeart}
                            translateTextAction={translateText}
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
