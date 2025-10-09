
'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BilingualFormField } from '@/app/brand-heart/_components/BilingualFormField';
import type { getProfile, updateBrandHeart, translateText, BrandHeartData, generateAudienceSuggestion } from '@/app/brand-heart/actions';

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type UpdateBrandHeartAction = typeof updateBrandHeart;
type TranslateTextAction = typeof translateText;
type GenerateAudienceAction = typeof generateAudienceSuggestion;

export interface AudienceFormProps {
    profile: Profile | null;
    brandHeart: BrandHeartData | null;
    languageNames: Map<string, string>;
    updateBrandHeartAction: UpdateBrandHeartAction;
    translateTextAction: TranslateTextAction;
    generateAudienceAction: GenerateAudienceAction;
}

export function AudienceForm({
    profile,
    brandHeart: initialBrandHeart,
    languageNames,
    updateBrandHeartAction,
    translateTextAction,
    generateAudienceAction,
}: AudienceFormProps) {
    const [brandHeart, setBrandHeart] = useState<BrandHeartData | null>(initialBrandHeart);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();

    const handleFieldChange = (field: keyof BrandHeartData, language: 'primary' | 'secondary', value: string) => {
        setBrandHeart(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [field]: {
                    ...(prev[field] as object),
                    [language]: value
                }
            };
        });
    };

    const handleAutoTranslate = async (fieldId: keyof BrandHeartData) => {
        if (!profile?.secondary_language || !brandHeart) return;

        const fieldData = (brandHeart as any)[fieldId];
        const primaryText = fieldData?.primary;
        const targetLanguage = languageNames.get(profile.secondary_language) || profile.secondary_language;

        if (!primaryText) {
            toast({ variant: 'destructive', title: 'Nothing to translate' });
            return;
        }

        setIsTranslating(fieldId as string);
        try {
            const result = await translateTextAction({ text: primaryText, targetLanguage });
            setBrandHeart((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    [fieldId]: { ...prev[fieldId], secondary: result.translatedText }
                };
            });
            toast({ title: 'Translated!' });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Translation Failed', description: error.message });
        } finally {
            setIsTranslating(null);
        }
    };

    const handleGenerateAudience = async () => {
        startGenerating(async () => {
            try {
                const result = await generateAudienceAction();
                setBrandHeart((prev) => {
                     if (!prev) return null;
                     return {
                        ...prev,
                        audience: { ...prev.audience, primary: result.profileText }
                     }
                });
                toast({ title: 'Audience Profile Generated!' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
            }
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!brandHeart) return;

        const formData = new FormData();
        // We only submit the audience field data from this form
        if (brandHeart.audience.primary) {
            formData.append('audience_primary', brandHeart.audience.primary);
        }
        if (brandHeart.audience.secondary) {
            formData.append('audience_secondary', brandHeart.audience.secondary);
        }

        startSaving(async () => {
            try {
                // We pass a complete form data object, but only audience is populated
                // The server action should handle partial updates gracefully
                await updateBrandHeartAction(formData);
                toast({ title: 'Success!', description: 'Audience profile saved.' });
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };

    if (!brandHeart) {
        return <div>Loading audience data...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
             <BilingualFormField
                id="audience"
                label="" // The CardTitle serves as the label
                value={brandHeart.audience}
                onFieldChange={handleFieldChange}
                profile={profile}
                isTranslating={isTranslating}
                isGenerating={isGenerating}
                languageNames={languageNames}
                handleAutoTranslate={handleAutoTranslate}
                onGenerate={() => handleGenerateAudience()}
            />
            <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Audience'}
            </Button>
        </form>
    );
}
