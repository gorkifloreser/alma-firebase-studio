'use client';

import { useEffect, useState } from 'react';
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
import { generateContentForOffering } from '../actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';

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
  const [generatedContent, setGeneratedContent] = useState<GenerateContentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    if (isOpen && offeringId && !generatedContent) {
      handleGenerateContent();
    } else if (!isOpen) {
      // Reset state when dialog closes
      setGeneratedContent(null);
      setIsLoading(false);
    }
  }, [isOpen, offeringId]);

  const handleGenerateContent = async () => {
    if (!offeringId) return;

    setIsLoading(true);
    try {
      const result = await generateContentForOffering({ offeringId });
      setGeneratedContent(result);
      toast({
        title: 'Content Generated!',
        description: 'Here are the drafts for your social media post.',
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

  const primaryLangName = languageNames.get(profile?.primary_language || 'en') || 'Primary';
  const secondaryLangName = profile?.secondary_language ? languageNames.get(profile.secondary_language) || 'Secondary' : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            AI Content for: <span className="font-bold">{offeringTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Here are the AI-generated drafts. You can copy them or ask for a regeneration.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-6 space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                {profile?.secondary_language && <Skeleton className="h-48 w-full" />}
            </div>
          ) : generatedContent ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{primaryLangName} Post</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{generatedContent.content.primary}</p>
                </CardContent>
              </Card>
              {generatedContent.content.secondary && secondaryLangName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{secondaryLangName} Post</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{generatedContent.content.secondary}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
             <div className="text-center text-muted-foreground py-10">
                Click "Regenerate" to start the AI.
             </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleGenerateContent} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
