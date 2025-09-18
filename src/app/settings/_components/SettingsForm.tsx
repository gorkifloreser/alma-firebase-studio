
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Avatar } from '@/components/auth/Avatar';
import type { getProfile, updateProfile } from '../actions';
import type { languages } from '@/lib/languages';


type Profile = Awaited<ReturnType<typeof getProfile>>;
type Languages = typeof languages;
type UpdateProfileAction = typeof updateProfile;

interface SettingsFormProps {
    profile: Profile,
    languages: Languages,
    updateProfileAction: UpdateProfileAction
}

export function SettingsForm({ profile, languages, updateProfileAction }: SettingsFormProps) {
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleFileSelect = (file: File | null) => {
        setAvatarFile(file);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }
        
        startTransition(async () => {
            try {
                const result = await updateProfileAction(formData);
                setAvatarFile(null);
                toast({
                    title: 'Success!',
                    description: result.message,
                });
                // Note: The parent server component will re-render with new data
                // due to revalidatePath in the server action.
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: error.message,
                });
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
            <div>
                <Label>Avatar</Label>
                <Avatar
                    url={profile?.avatar_url}
                    isUploading={isPending}
                    onFileSelect={handleFileSelect}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" defaultValue={profile?.full_name || ''} disabled={isPending} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={profile?.website || ''} disabled={isPending} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="primary-language">Primary Language</Label>
                <Select name="primaryLanguage" defaultValue={profile?.primary_language || 'en'} disabled={isPending}>
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
                <Select name="secondaryLanguage" defaultValue={profile?.secondary_language || 'none'} disabled={isPending}>
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
    );
}

