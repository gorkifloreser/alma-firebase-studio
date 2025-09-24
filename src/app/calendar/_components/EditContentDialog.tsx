
'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateContent, type ContentItem } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

interface EditContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contentItem: ContentItem | null;
  onContentUpdated: (contentItem: ContentItem) => void;
}

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

export function EditContentDialog({
  isOpen,
  onOpenChange,
  contentItem,
  onContentUpdated,
}: EditContentDialogProps) {
  const [profile, setProfile] = useState<Profile>(null);
  const [editableContent, setEditableContent] = useState(contentItem?.content_body);
  const [isSaving, startSaving] = useTransition();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { toast } = useToast();
  const languageNames = new Map(languages.map(l => [l.value, l.label]));

  useEffect(() => {
    async function fetchProfile() {
        if(isOpen) {
            setIsLoadingProfile(true);
            const profileData = await getProfile();
            setProfile(profileData);
            setIsLoadingProfile(false);
        }
    }
    fetchProfile();
  }, [isOpen]);

  useEffect(() => {
    if (contentItem) {
        setEditableContent(contentItem.content_body);
    }
  }, [contentItem]);

  if (!contentItem) return null;

  const handleContentChange = (language: 'primary' | 'secondary', value: string) => {
    setEditableContent(prev => ({
        primary: null, // default
        secondary: null, // default
        ...prev,
        [language]: value
    }));
  };

  const handleSave = () => {
    if (!editableContent) return;
    
    startSaving(async () => {
      try {
        const updatedContent = await updateContent(contentItem.id, editableContent);
        onContentUpdated(updatedContent);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to Save',
          description: error.message,
        });
      }
    });
  };

  const primaryLangName = languageNames.get(profile?.primary_language || 'en') || 'Primary';
  const secondaryLangName = profile?.secondary_language ? languageNames.get(profile.secondary_language) || 'Secondary' : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            For offering: <span className="font-semibold">{contentItem.offerings?.title?.primary || '...'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-6 py-4 space-y-6">
            {contentItem.image_url && (
                <div className="relative aspect-square w-full">
                    <Image src={contentItem.image_url} alt="Content image" fill className="rounded-lg object-contain mx-auto" />
                </div>
            )}
             {contentItem.carousel_slides && (
                <Card>
                    <CardHeader><CardTitle className="text-base">Carousel Slides</CardTitle></CardHeader>
                    <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{JSON.stringify(contentItem.carousel_slides, null, 2)}</CardContent>
                </Card>
            )}
            {contentItem.video_url && (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                    <video src={contentItem.video_url} controls className="w-full h-full" />
                </div>
            )}
            {isLoadingProfile ? (
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    {profile?.secondary_language && <Skeleton className="h-48 w-full" />}
                </div>
            ) : (
                <div className="space-y-6">
                <Card>
                    <CardHeader>
                    <CardTitle className="text-lg">{primaryLangName} Post</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Textarea 
                        value={editableContent?.primary || ''}
                        onChange={(e) => handleContentChange('primary', e.target.value)}
                        className="h-48 resize-none"
                        placeholder="Primary content..."
                    />
                    </CardContent>
                </Card>
                {secondaryLangName && (
                    <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{secondaryLangName} Post</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                        value={editableContent?.secondary || ''}
                        onChange={(e) => handleContentChange('secondary', e.target.value)}
                        className="h-48 resize-none"
                        placeholder="Secondary content..."
                        />
                    </CardContent>
                    </Card>
                )}
                </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
