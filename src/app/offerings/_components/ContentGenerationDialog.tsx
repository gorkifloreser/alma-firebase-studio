
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
import { generateContentForOffering, saveContent } from '../actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';

interface ContentGenerationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offeringId: string | null;
  offeringTitle: string | null;
}

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

export function ContentGenerationDialog({
  isOpen,
  onOpenChange,
  offeringId,
  offeringTitle,
}: ContentGenerationDialogProps) {
  const [profile, setProfile] = useState<Profile>(null);
  const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const languageNames = new Map(languages.map(l => [l.value, l.label]));

  useEffect(() => {
    async function fetchProfile() {
        if(isOpen) {
            const profileData = await getProfile();
            setProfile(profileData);
        }
    }
    fetchProfile();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && offeringId && !editableContent) {
      handleGenerateContent();
    } else if (!isOpen) {
      // Reset state when dialog closes
      setEditableContent(null);
      setIsLoading(false);
    }
  }, [isOpen, offeringId]);

  const handleGenerateContent = async () => {
    if (!offeringId) return;

    setIsLoading(true);
    setEditableContent(null); // Clear previous content before generating new one
    try {
      const result = await generateContentForOffering({ offeringId });
      setEditableContent(result.content);
      toast({
        title: 'Content Generated!',
        description: 'You can now edit and approve the drafts.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
      onOpenChange(false); // Close dialog on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (language: 'primary' | 'secondary', value: string) => {
    setEditableContent(prev => {
        if (!prev) return null;
        return { ...prev, [language]: value };
    });
  };

  const handleApprove = () => {
    if (!offeringId || !editableContent) {
      toast({ variant: 'destructive', title: 'Error', description: 'No content to save.' });
      return;
    }
    
    startSaving(async () => {
      try {
        await saveContent({
          offeringId,
          contentBody: editableContent,
          status: 'approved',
        });
        toast({
          title: 'Approved!',
          description: 'The content has been saved to your collection.',
        });
        onOpenChange(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to Approve',
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
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Artisan's Workshop: <span className="font-bold">{offeringTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Review, edit, and approve the AI-generated drafts. This is your space to add the final human touch.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                {profile?.secondary_language && <Skeleton className="h-48 w-full" />}
            </div>
          ) : editableContent ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{primaryLangName} Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    value={editableContent.primary}
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
                      value={editableContent.secondary || ''}
                      onChange={(e) => handleContentChange('secondary', e.target.value)}
                      className="h-48 resize-none"
                      placeholder="Secondary content..."
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
             <div className="text-center text-muted-foreground py-10">
                Click "Generate" to start the AI.
             </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleGenerateContent} variant="ghost" disabled={isLoading || isSaving}>
            {isLoading ? 'Generating...' : 'Regenerate'}
          </Button>
          <Button onClick={handleApprove} disabled={isLoading || isSaving || !editableContent}>
            {isSaving ? 'Approving...' : 'Approve & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
