
'use client';

import React, { useEffect, useState, useTransition } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';
import { languages } from '@/lib/languages';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type BrandHeartData = {
    brand_name: string;
    brand_brief: { primary: string | null; secondary: string | null };
    mission: { primary: string | null; secondary: string | null };
    vision: { primary: string | null; secondary: string | null };
    values: { primary: string | null; secondary: string | null };
    tone_of_voice: { primary: string | null; secondary: string | null };
};

const initialBrandHeartState: BrandHeartData = {
    brand_name: '',
    brand_brief: { primary: '', secondary: '' },
    mission: { primary: '', secondary: '' },
    vision: { primary: '', secondary: '' },
    values: { primary: '', secondary: '' },
    tone_of_voice: { primary: '', secondary: '' },
};


export default function BrandHeartPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [brandHeart, setBrandHeart] = useState<BrandHeartData>(initialBrandHeartState);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();

    const languageNames = new Map(languages.map(l => [l.value, l.label]));


    const fetchAllData = async () => {
        try {
            const [profileData, brandHeartData] = await Promise.all([
                getProfile(),
                getBrandHeart(),
            ]);
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

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
            setIsLoading(true);
            await fetchAllData();
        };

        checkUserAndFetchData();
    }, [toast]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name.includes('_')) {
            const [field, lang] = name.split('_') as [keyof Omit<BrandHeartData, 'brand_name'>, 'primary' | 'secondary'];
            setBrandHeart(prev => ({
                ...prev,
                [field]: { ...prev[field], [lang]: value }
            }));
        } else {
            setBrandHeart(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('brand_name', brandHeart.brand_name);
        Object.keys(brandHeart).forEach(key => {
            if (key !== 'brand_name') {
                const typedKey = key as keyof Omit<BrandHeartData, 'brand_name'>;
                formData.append(`${typedKey}_primary`, brandHeart[typedKey].primary || '');
                formData.append(`${typedKey}_secondary`, brandHeart[typedKey].secondary || '');
            }
        });

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
    
    const handleAutoTranslate = async (fieldId: keyof Omit<BrandHeartData, 'brand_name'>) => {
        if (!profile?.secondary_language) return;

        const primaryText = brandHeart[fieldId].primary;
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
            setBrandHeart(prev => ({
                ...prev,
                [fieldId]: { ...prev[fieldId], secondary: result.translatedText }
            }));
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

    const BilingualFormField = ({ id, label }: { id: keyof Omit<BrandHeartData, 'brand_name'>, label: string }) => (
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
                    <Textarea id={`${id}_primary`} name={`${id}_primary`} value={brandHeart[id].primary || ''} onChange={handleFormChange} className="mt-1" rows={5} />
                </div>
                {profile?.secondary_language && (
                     <div>
                        <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
                        <Textarea id={`${id}_secondary`} name={`${id}_secondary`} value={brandHeart[id].secondary || ''} onChange={handleFormChange} className="mt-1" rows={5} />
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
                                    <Input id="brand_name" name="brand_name" value={brandHeart.brand_name} onChange={handleFormChange} />
                                </div>
                                <BilingualFormField id="brand_brief" label="Brand Brief" />
                                <BilingualFormField id="mission" label="Mission" />
                                <BilingualFormField id="vision" label="Vision" />
                                <BilingualFormField id="values" label="Values" />
                                <BilingualFormField id="tone_of_voice" label="Tone of Voice" />
                                
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
