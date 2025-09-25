

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import type { getProfile, getBrandHeart } from '../actions';

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;
type BrandHeartData = NonNullable<Awaited<ReturnType<typeof getBrandHeart>>>;
type BrandHeartFields = Omit<BrandHeartData, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'logo_url' | 'brand_name'>;


export interface BilingualFormFieldProps {
    id: keyof BrandHeartFields;
    label: string;
    value: { primary: string | null; secondary: string | null; };
    onFieldChange: (field: keyof BrandHeartFields, language: 'primary' | 'secondary', value: string) => void;
    profile: Profile | null;
    isTranslating: string | null;
    languageNames: Map<string, string>;
    handleAutoTranslate: (fieldId: keyof BrandHeartFields) => void;
}

export function BilingualFormField({
    id,
    label,
    value,
    onFieldChange,
    profile,
    isTranslating,
    languageNames,
    handleAutoTranslate,
}: BilingualFormFieldProps) {
    
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
                    <Textarea 
                        id={`${id}_primary`} 
                        name={`${id}_primary`} 
                        value={value?.primary || ''} 
                        onChange={(e) => onFieldChange(id, 'primary', e.target.value)} 
                        className="mt-1" 
                        rows={5} 
                    />
                </div>
                {profile?.secondary_language && (
                    <div>
                        <Label htmlFor={`${id}_secondary`} className="text-sm text-muted-foreground">Secondary ({languageNames.get(profile.secondary_language)})</Label>
                        <Textarea 
                            id={`${id}_secondary`} 
                            name={`${id}_secondary`} 
                            value={value?.secondary || ''} 
                            onChange={(e) => onFieldChange(id, 'secondary', e.target.value)} 
                            className="mt-1" 
                            rows={5} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
