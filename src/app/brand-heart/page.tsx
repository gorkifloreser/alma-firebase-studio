
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfile } from '@/app/settings/actions';
import { getBrandHeart, updateBrandHeart } from './actions';
import { Sparkles } from 'lucide-react';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type BrandHeart = {
    brand_name: string;
    brand_brief: { primary: string | null; secondary: string | null };
    mission: { primary: string | null; secondary: string | null };
    vision: { primary: string | null; secondary: string | null };
    values: { primary: string | null; secondary: string | null };
    tone_of_voice: { primary: string | null; secondary: string | null };
} | null;


export default function BrandHeartPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [brandHeart, setBrandHeart] = useState<BrandHeart>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }

            setIsLoading(true);
            try {
                const profileData = await getProfile();
                const brandHeartData = await getBrandHeart();
                
                setProfile(profileData);
                if (brandHeartData) {
 setBrandHeart(brandHeartData);
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.message || 'Could not fetch your data.',
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
        
        startTransition(async () => {
            try {
                const result = await updateBrandHeart(formData);
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

    const BilingualFormField = ({ id, label, primaryValue, secondaryValue }: { id: string, label: string, primaryValue: string, secondaryValue: string | null }) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label htmlFor={`${id}_primary`} className="text-lg font-semibold">{label}</Label>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Auto-translate
                </Button>
            </div>
            <div className={`grid gap-4 ${profile?.secondary_language ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                     <Label htmlFor={`${id}_primary`} className="text-sm text-muted-foreground">Primary ({profile?.primary_language})</Label>
                    <Textarea id={`${id}_primary`} name={`${id}_primary`} defaultValue={primaryValue || ''} className="mt-1" rows={5} />
                </div>
                {profile?.secondary_language && (
                     <div>
                        <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({profile?.secondary_language})</Label>
                        <Textarea id={`${id}_secondary`} name={`${id}_secondary`} defaultValue={secondaryValue || ''} className="mt-1" rows={5} />
                    </div>
                )}
            </div>
        </div>
    );

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
                        {isLoading ? (
                            <div className="space-y-8">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-2">
                                    <Label htmlFor="brand_name" className="text-lg font-semibold">Brand Name</Label>
                                    <Input id="brand_name" name="brand_name" defaultValue={brandHeart?.brand_name || ''} />
                                </div>
                                <BilingualFormField id="brand_brief" label="Brand Brief" primaryValue={brandHeart?.brand_brief?.primary || ''} secondaryValue={brandHeart?.brand_brief?.secondary || ''} />
                                <BilingualFormField id="mission" label="Mission" primaryValue={brandHeart?.mission?.primary || ''} secondaryValue={brandHeart?.mission?.secondary || ''} />
                                <BilingualFormField id="vision" label="Vision" primaryValue={brandHeart?.vision?.primary || ''} secondaryValue={brandHeart?.vision?.secondary || ''} />
                                <BilingualFormField id="values" label="Values" primaryValue={brandHeart?.values?.primary || ''} secondaryValue={brandHeart?.values?.secondary || ''} />
                                <BilingualFormField id="tone_of_voice" label="Tone of Voice" primaryValue={brandHeart?.tone_of_voice?.primary || ''} secondaryValue={brandHeart?.tone_of_voice?.secondary || ''} />
                                
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Saving...' : 'Save Brand Heart'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
