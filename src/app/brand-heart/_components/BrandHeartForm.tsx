
'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar } from '@/components/auth/Avatar';
import { BilingualFormField } from './BilingualFormField';
import { MultiContactEditor } from './MultiContactEditor';
import type { getProfile, updateBrandHeart, translateText, BrandHeartData, ContactInfo, AudiencePersona } from '../actions';


type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type UpdateBrandHeartAction = typeof updateBrandHeart;
type TranslateTextAction = typeof translateText;

type BrandHeartFields = Omit<BrandHeartData, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'logo_url' | 'brand_name' | 'visual_identity' | 'contact_info' | 'audience'>;

export interface BrandHeartFormProps {
    profile: Profile | null;
    brandHeart: BrandHeartData | null;
    languageNames: Map<string, string>;
    updateBrandHeartAction: UpdateBrandHeartAction;
    translateTextAction: TranslateTextAction;
}

const initialBrandHeartState: BrandHeartData = {
    brand_name: '',
    logo_url: null,
    brand_brief: { primary: '', secondary: '' },
    mission: { primary: '', secondary: '' },
    vision: { primary: '', secondary: '' },
    values: { primary: '', secondary: '' },
    tone_of_voice: { primary: '', secondary: '' },
    audience: [],
    visual_identity: { primary: '', secondary: '' },
    contact_info: [],
};


export function BrandHeartForm({ 
    profile, 
    brandHeart: initialBrandHeart,
    languageNames,
    updateBrandHeartAction,
    translateTextAction,
}: BrandHeartFormProps) {
    
    const [brandHeart, setBrandHeart] = useState<BrandHeartData>(initialBrandHeart || initialBrandHeartState);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();
    
    const handleFileSelect = (file: File | null) => {
        setLogoFile(file);
    };

    const handleFieldChange = (field: keyof BrandHeartData, language: 'primary' | 'secondary', value: string) => {
        setBrandHeart(prev => ({
            ...prev,
            [field]: {
                ...((prev[field] as object) || {}),
                [language]: value
            }
        }));
    };
    
    const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBrandHeart(prev => ({ ...prev, brand_name: e.target.value }));
    };

    const handleContactInfoChange = (newContactInfo: ContactInfo[]) => {
        setBrandHeart(prev => ({ ...prev, contact_info: newContactInfo }));
    };
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData();
        
        formData.append('brand_name', brandHeart.brand_name || '');
        (Object.keys(brandHeart) as Array<keyof BrandHeartData>).forEach(key => {
            if (key === 'contact_info' || key === 'audience') {
                 formData.append(key, JSON.stringify(brandHeart[key]));
            } else if (typeof brandHeart[key] === 'object' && brandHeart[key] !== null) {
                const bilingualValue = brandHeart[key] as { primary: string | null, secondary: string | null };
                if (bilingualValue.primary) {
                    formData.append(`${key}_primary`, bilingualValue.primary);
                }
                 if (bilingualValue.secondary) {
                    formData.append(`${key}_secondary`, bilingualValue.secondary);
                }
            }
        });

        if (logoFile) {
            formData.append('logo', logoFile);
        }

        startSaving(async () => {
            try {
                const result = await updateBrandHeartAction(formData);
                setLogoFile(null);
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
    
    const handleAutoTranslate = async (fieldId: keyof BrandHeartData) => {
        if (!profile?.secondary_language) return;

        const fieldData = (brandHeart as any)[fieldId];
        const primaryText = fieldData.primary;
        const targetLanguage = languageNames.get(profile.secondary_language) || profile.secondary_language;

        if (!primaryText) {
            toast({
                variant: 'destructive',
                title: 'Nothing to translate',
                description: 'Please enter some text in the primary field first.',
            });
            return;
        }

        setIsTranslating(fieldId as string);
        try {
            const result = await translateTextAction({ text: primaryText, targetLanguage });
            setBrandHeart((prev: any) => ({
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

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="space-y-2 flex-shrink-0">
                    <Label className="text-lg font-semibold">Brand Logo</Label>
                    <Avatar
                        url={brandHeart?.logo_url}
                        isUploading={isSaving}
                        onFileSelect={handleFileSelect}
                        accept="image/png, image/jpeg, image/gif, image/svg+xml"
                    />
                </div>
                <div className="space-y-2 w-full">
                    <Label htmlFor="brand_name" className="text-lg font-semibold">Brand Name</Label>
                    <Input id="brand_name" name="brand_name" value={brandHeart?.brand_name || ''} onChange={handleBrandNameChange} />
                </div>
            </div>

            <BilingualFormField 
                id="brand_brief" 
                label="Brand Brief" 
                value={brandHeart.brand_brief}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />
            <BilingualFormField 
                id="mission" 
                label="Mission" 
                value={brandHeart.mission}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />
            <BilingualFormField 
                id="vision" 
                label="Vision" 
                value={brandHeart.vision}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />
             <BilingualFormField 
                id="values" 
                label="Values" 
                value={brandHeart.values}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />
             <BilingualFormField 
                id="tone_of_voice" 
                label="Tone of Voice" 
                value={brandHeart.tone_of_voice}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />
            <BilingualFormField 
                id="visual_identity" 
                label="Visual Identity" 
                value={brandHeart.visual_identity}
                onFieldChange={handleFieldChange}
                profile={profile} 
                isTranslating={isTranslating} 
                languageNames={languageNames} 
                handleAutoTranslate={handleAutoTranslate}
            />

            <MultiContactEditor 
                contacts={brandHeart.contact_info}
                onContactsChange={handleContactInfoChange}
            />
            
            <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Brand Heart'}
            </Button>
        </form>
    );
}
