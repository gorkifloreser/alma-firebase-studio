
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
import { generateContentForOffering, saveContent, generateCreativeForOffering } from '../actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import type { GenerateCreativeOutput } from '@/ai/flows/generate-creative-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Image as ImageIcon, Video, Layers, Type } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Image from 'next/image';


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

type CreativeType = 'text' | 'image' | 'carousel' | 'video';

const creativeOptions: { id: CreativeType, label: string, icon: React.ElementType }[] = [
    { id: 'text', label: 'Text Post', icon: Type },
    { id: 'image', label: 'Single Image', icon: ImageIcon },
    { id: 'carousel', label: 'Carousel', icon: Layers },
    { id: 'video', label: 'Video', icon: Video },
];

export function ContentGenerationDialog({
  isOpen,
  onOpenChange,
  offeringId,
  offeringTitle,
}: ContentGenerationDialogProps) {
  const [profile, setProfile] = useState<Profile>(null);
  const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
  const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
  const [selectedCreativeTypes, setSelectedCreativeTypes] = useState<CreativeType[]>(['text']);
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
    if (!isOpen) {
      // Reset state when dialog closes
      setEditableContent(null);
      setCreative(null);
      setIsLoading(false);
      setSelectedCreativeTypes(['text']);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!offeringId || selectedCreativeTypes.length === 0) return;

    setIsLoading(true);
    setEditableContent(null);
    setCreative(null);
    
    try {
        let finalCreativeOutput: GenerateCreativeOutput = {};
        let finalContentOutput: GenerateContentOutput['content'] | null = null;

        // Text is a base for others, so we might generate it anyway
        if (selectedCreativeTypes.includes('text') || selectedCreativeTypes.includes('image') || selectedCreativeTypes.includes('carousel')) {
            const result = await generateContentForOffering({ offeringId });
            finalContentOutput = result.content;
        }

        if (selectedCreativeTypes.includes('image') || selectedCreativeTypes.includes('carousel') || selectedCreativeTypes.includes('video')) {
             const result = await generateCreativeForOffering({ 
                offeringId, 
                creativeTypes: selectedCreativeTypes.filter(t => t !== 'text')
            });
            finalCreativeOutput = result;
        }
      
        setEditableContent(finalContentOutput);
        setCreative(finalCreativeOutput);

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
      toast({ variant: 'destructive', title: 'Error', description: 'No text content to save.' });
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

  const CreativePreview = () => {
    if (isLoading) {
      return <Skeleton className="aspect-video w-full" />
    }

    if (!creative) return null;

    return (
        <div className="space-y-4">
            {selectedCreativeTypes.includes('image') && creative.imageUrl && (
                 <Image src={creative.imageUrl} alt="Generated creative" width={512} height={512} className="rounded-lg object-contain mx-auto" />
            )}
             {selectedCreativeTypes.includes('carousel') && creative.carouselSlidesText && (
                <Card>
                    <CardHeader><CardTitle className="text-base">Carousel Slide Suggestions</CardTitle></CardHeader>
                    <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{creative.carouselSlidesText}</CardContent>
                </Card>
            )}
            {selectedCreativeTypes.includes('video') && creative.videoScript && (
                <Card>
                    <CardHeader><CardTitle className="text-base">Video Script</CardTitle></CardHeader>
                    <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{creative.videoScript}</CardContent>
                </Card>
            )}
        </div>
    );
  }

  const handleCheckboxChange = (type: CreativeType) => {
    setSelectedCreativeTypes(prev => 
        prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Artisan's Workshop: <span className="font-bold">{offeringTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Generate, review, and approve AI-generated creatives for your offering.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 py-4">
            <div className="md:w-1/3">
                <h3 className="font-semibold mb-4">Creative Types</h3>
                <div className="space-y-3">
                    {creativeOptions.map(({ id, label, icon: Icon }) => (
                         <div key={id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={id}
                                checked={selectedCreativeTypes.includes(id)}
                                onCheckedChange={() => handleCheckboxChange(id)}
                                disabled={isLoading}
                            />
                            <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
                                <Icon /> {label}
                            </Label>
                        </div>
                    ))}
                </div>
                <Button onClick={handleGenerate} className="w-full mt-6" disabled={isLoading || isSaving || selectedCreativeTypes.length === 0}>
                    {isLoading ? 'Generating...' : 'Generate Creatives'}
                </Button>
            </div>
            <div className="md:w-2/3 max-h-[70vh] overflow-y-auto pr-6 space-y-6">
                <CreativePreview />
                {isLoading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                        {profile?.secondary_language && <Skeleton className="h-48 w-full" />}
                    </div>
                ) : editableContent ? (
                    <div className="space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle className="text-lg">{primaryLangName} Post</CardTitle>
                        </CardHeader>
                        <CardContent>
                        <Textarea 
                            value={editableContent.primary || ''}
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
                    !isLoading && (
                        <div className="text-center text-muted-foreground py-10">
                            Select creative types and click "Generate" to start.
                        </div>
                    )
                )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isLoading || isSaving || !editableContent}>
            {isSaving ? 'Approving...' : 'Approve & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
