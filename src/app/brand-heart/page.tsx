
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
import { getBrandHeart, updateBrandHeart, translateText } from './actions';
import { Sparkles } from 'lucide-react';
import { languages } from '@/lib/languages';

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
    const [brandHeart, setBrandHeart] = useState<BrandHeart | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();

    // Memoize language names for quick lookup
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

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
        
        startSaving(async () => {
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
    
    const handleAutoTranslate = async (fieldId: keyof Omit<BrandHeart, 'brand_name'>) => {
        if (!profile?.secondary_language) return;

        const form = document.querySelector('form');
        if (!form) return;

        const primaryText = (form.elements.namedItem(`${fieldId}_primary`) as HTMLTextAreaElement)?.value;
        const targetLanguage = languageNames.get(profile.secondary_language) || profile.secondary_language;

        if (!primaryText) {
            toast({
                variant: 'destructive',
                title: 'Nothing to translate',
                description: 'Please enter some text in the primary field first.',
            });
            return;
        }

        setIsTranslating(fieldId);
        try {
            const result = await translateText({ text: primaryText, targetLanguage });
            const secondaryTextarea = form.elements.namedItem(`${fieldId}_secondary`) as HTMLTextAreaElement;
            if (secondaryTextarea) {
                secondaryTextarea.value = result.translatedText;
            }
            toast({
                title: 'Translated!',
                description: `Text has been translated to ${targetLanguage}.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Translation Failed',
                description: error.message,
            });
        } finally {
            setIsTranslating(null);
        }
    };

    const BilingualFormField = ({ id, label, primaryValue, secondaryValue }: { id: keyof Omit<BrandHeart, 'brand_name'>, label: string, primaryValue?: string | null, secondaryValue?: string | null }) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label htmlFor={`${id}_primary`} className="text-lg font-semibold">{label}</Label>
                 {profile?.secondary_language && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="gap-2" 
                        onClick={() => handleAutoTranslate(id)}
                        disabled={isTranslating === id}
                    >
                        <Sparkles className={`h-4 w-4 ${isTranslating === id ? 'animate-spin' : ''}`} />
                        {isTranslating === id ? 'Translating...' : 'Auto-translate'}
                    </Button>
                )}
            </div>
            <div className={`grid gap-4 ${profile?.secondary_language ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                     <Label htmlFor={`${id}_primary`} className="text-sm text-muted-foreground">Primary ({languageNames.get(profile?.primary_language || 'en')})</Label>
                    <Textarea id={`${id}_primary`} name={`${id}_primary`} defaultValue={primaryValue || ''} className="mt-1" rows={5} />
                </div>
                {profile?.secondary_language && (
                     <div>
                        <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
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
                                <BilingualFormField id="brand_brief" label="Brand Brief" primaryValue={brandHeart?.brand_brief?.primary} secondaryValue={brandHeart?.brand_brief?.secondary} />
                                <BilingualFormField id="mission" label="Mission" primaryValue={brandHeart?.mission?.primary} secondaryValue={brandHeart?.mission?.secondary} />
                                <BilingualFormField id="vision" label="Vision" primaryValue={brandHeart?.vision?.primary} secondaryValue={brandHeart?.vision?.secondary} />
                                <BilingualFormField id="values" label="Values" primaryValue={brandHeart?.values?.primary} secondaryValue={brandHeart?.values?.secondary} />
                                <BilingualFormField id="tone_of_voice" label="Tone of Voice" primaryValue={brandHeart?.tone_of_voice?.primary} secondaryValue={brandHeart?.tone_of_voice?.secondary} />
                                
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Brand Heart'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
