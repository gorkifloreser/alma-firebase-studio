
'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';
import { Avatar } from '@/components/auth/Avatar';
import type { getProfile, getBrandHeart, updateBrandHeart, translateText } from '../actions';


type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type BrandHeartData = NonNullable<Awaited<ReturnType<typeof getBrandHeart>>>;
type UpdateBrandHeartAction = typeof updateBrandHeart;
type TranslateTextAction = typeof translateText;

interface BrandHeartFormProps {
    profile: Profile | null;
    brandHeart: BrandHeartData | null;
    languageNames: Map<string, string>;
    updateBrandHeartAction: UpdateBrandHeartAction;
    translateTextAction: TranslateTextAction;
}

const initialBrandHeartState = {
    brand_name: '',
    logo_url: null,
    brand_brief: { primary: '', secondary: '' },
    mission: { primary: '', secondary: '' },
    vision: { primary: '', secondary: '' },
    values: { primary: '', secondary: '' },
    tone_of_voice: { primary: '', secondary: '' },
};


export function BrandHeartForm({ 
    profile, 
    brandHeart: initialBrandHeart,
    languageNames,
    updateBrandHeartAction,
    translateTextAction,
}: BrandHeartFormProps) {
    
    const [brandHeart, setBrandHeart] = useState<any>(initialBrandHeart || initialBrandHeartState);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const { toast } = useToast();
    
    type BrandHeartFields = Omit<typeof brandHeart, 'brand_name' | 'id' | 'user_id' | 'created_at' | 'updated_at' | 'logo_url'>;

    const handleFileSelect = (file: File | null) => {
        setLogoFile(file);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name.includes('_')) {
            const [field, lang] = name.split('_') as [keyof BrandHeartFields, 'primary' | 'secondary'];
            setBrandHeart((prev:any) => ({
                ...prev,
                [field]: { ...(prev as BrandHeartData)[field], [lang]: value }
            }));
        } else {
            setBrandHeart((prev:any) => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
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
    
    const handleAutoTranslate = async (fieldId: keyof BrandHeartFields) => {
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

        setIsTranslating(fieldId);
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

    const BilingualFormField = ({ id, label }: { id: keyof BrandHeartFields, label: string }) => {
        const value = (brandHeart as any)[id];

        return (
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
                        <Textarea id={`${id}_primary`} name={`${id}_primary`} value={value?.primary || ''} onChange={handleFormChange} className="mt-1" rows={5} />
                    </div>
                    {profile?.secondary_language && (
                         <div>
                            <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
                            <Textarea id={`${id}_secondary`} name={`${id}_secondary`} value={value?.secondary || ''} onChange={handleFormChange} className="mt-1" rows={5} />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
                <Label htmlFor="brand_name" className="text-lg font-semibold">Brand Name</Label>
                <Input id="brand_name" name="brand_name" defaultValue={brandHeart?.brand_name || ''} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
                 <Label className="text-lg font-semibold">Brand Logo</Label>
                 <Avatar
                    url={brandHeart?.logo_url}
                    isUploading={isSaving}
                    onFileSelect={handleFileSelect}
                    accept="image/png, image/jpeg, image/gif, image/svg+xml"
                />
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
    );
}
