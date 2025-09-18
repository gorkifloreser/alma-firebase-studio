
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
import { Sparkles, Image as ImageIcon, Video, Layers, Type, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Funnel } from '@/app/funnels/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

type PlanItem = {
    offeringId: string;
    channel: string;
    format: string;
    copy: string;
    hashtags: string;
    creativePrompt: string;
    id?: string;
};

interface ContentGenerationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offeringId: string | null;
  offeringTitle: string | null;
  funnels: Funnel[];
  sourcePlanItem?: PlanItem | null;
}

type Profile = {
    full_name: string | null;
    avatar_url: string | null;
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
  funnels,
  sourcePlanItem,
}: ContentGenerationDialogProps) {
  const [profile, setProfile] = useState<Profile>(null);
  const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
  const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
  const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('image');
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
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
      setSelectedCreativeType('image');
      setSelectedFunnelId(null);
    } else {
        if (sourcePlanItem) {
            if (sourcePlanItem.format.toLowerCase().includes('video')) {
                setSelectedCreativeType('video');
            } else if (sourcePlanItem.format.toLowerCase().includes('carousel')) {
                setSelectedCreativeType('carousel');
            } else if (sourcePlanItem.format.toLowerCase().includes('image')) {
                setSelectedCreativeType('image');
            } else {
                setSelectedCreativeType('text');
            }
        }
    }
  }, [isOpen, sourcePlanItem]);

  const handleGenerate = async () => {
    if (!offeringId) return;

    setIsLoading(true);
    setEditableContent(null);
    setCreative(null);
    
    try {
        const creativeTypes: CreativeType[] = [selectedCreativeType];
        
        let finalCreativeOutput: GenerateCreativeOutput = {};
        let finalContentOutput: GenerateContentOutput['content'] | null = null;

        const textBasedSelected = creativeTypes.includes('text') || creativeTypes.includes('carousel');
        const visualBasedSelected = creativeTypes.includes('image') || creativeTypes.includes('video') || creativeTypes.includes('carousel');

        const promises = [];
        
        const contentPromise = generateContentForOffering({ offeringId, funnelId: selectedFunnelId });
        promises.push(contentPromise);

        if (visualBasedSelected) {
            const creativeTypesForFlow = creativeTypes.filter(t => t !== 'text') as ('image' | 'carousel' | 'video')[];
            if (creativeTypesForFlow.length > 0) {
                 const creativePromise = generateCreativeForOffering({ 
                    offeringId, 
                    creativeTypes: creativeTypesForFlow
                });
                promises.push(creativePromise);
            }
        }
      
        const results = await Promise.all(promises);

        const contentResult = results.find(r => r && 'content' in r) as GenerateContentOutput | undefined;
        if (contentResult) finalContentOutput = contentResult.content;
        
        if (visualBasedSelected) {
            const creativeResult = results.find(r => r && ('imageUrl' in r || 'videoScript' in r || 'carouselSlidesText' in r)) as GenerateCreativeOutput | undefined;
            if (creativeResult) finalCreativeOutput = creativeResult;
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
        if (!prev) return { primary: null, secondary: null, [language]: value };
        return { ...prev, [language]: value };
    });
  };

  const handleApprove = () => {
    if (!offeringId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Offering ID is missing.' });
        return;
    }
    if (!editableContent && !creative) {
      toast({ variant: 'destructive', title: 'Error', description: 'No content to save.' });
      return;
    }
    
    startSaving(async () => {
      try {
        await saveContent({
          offeringId,
          contentBody: editableContent,
          imageUrl: creative?.imageUrl || null,
          carouselSlidesText: creative?.carouselSlidesText || null,
          videoScript: creative?.videoScript || null,
          status: 'approved',
          sourcePlan: sourcePlanItem ? {
            channel: sourcePlanItem.channel,
            format: sourcePlanItem.format,
            copy: sourcePlanItem.copy,
            hashtags: sourcePlanItem.hashtags,
            creativePrompt: sourcePlanItem.creativePrompt,
          } : null,
          mediaPlanItemId: sourcePlanItem?.id,
        });
        toast({
          title: 'Approved!',
          description: 'The content has been saved and is ready for the calendar.',
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

  const SocialPostPreview = () => {
    const postUser = profile?.full_name || 'Your Brand';
    const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <Avatar>
                    <AvatarImage src={profile?.avatar_url || undefined} alt={postUser} />
                    <AvatarFallback>{postUser.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5">
                    <span className="font-semibold">{postUser}</span>
                    <span className="text-xs text-muted-foreground">@{postUserHandle}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                 {isLoading ? (
                    <Skeleton className="aspect-square w-full" />
                ) : (
                    <>
                        {selectedCreativeType === 'image' && creative?.imageUrl && (
                            <div className="relative aspect-square w-full">
                                <Image src={creative.imageUrl} alt="Generated creative" fill className="object-cover" />
                            </div>
                        )}
                        {selectedCreativeType === 'carousel' && (
                            <>
                                {creative?.imageUrl && (
                                     <div className="relative aspect-square w-full">
                                        <Image src={creative.imageUrl} alt="Generated creative" fill className="object-cover" />
                                    </div>
                                )}
                                {creative?.carouselSlidesText && (
                                    <div className="p-4 text-sm text-muted-foreground bg-secondary/50">
                                        <h4 className="font-semibold text-foreground mb-2">Carousel Slide Text:</h4>
                                        <p className="whitespace-pre-wrap">{creative.carouselSlidesText}</p>
                                    </div>
                                )}
                            </>
                        )}
                         {selectedCreativeType === 'video' && creative?.videoScript && (
                            <div className="p-4 text-sm text-muted-foreground bg-secondary aspect-square flex flex-col justify-center">
                                <h4 className="font-semibold text-foreground mb-2">Video Script:</h4>
                                <p className="whitespace-pre-wrap flex-1 overflow-y-auto">{creative.videoScript}</p>
                            </div>
                        )}
                    </>
                 )}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2 pt-2">
                <div className="flex justify-between w-full">
                    <div className="flex gap-4">
                        <Heart className="h-6 w-6 cursor-pointer hover:text-red-500" />
                        <MessageCircle className="h-6 w-6 cursor-pointer hover:text-primary" />
                        <Send className="h-6 w-6 cursor-pointer hover:text-primary" />
                    </div>
                    <Bookmark className="h-6 w-6 cursor-pointer hover:text-primary" />
                </div>
                 {editableContent?.primary && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{editableContent.primary}</p>}
                 {secondaryLangName && editableContent?.secondary && (
                    <>
                        <Separator className="my-2"/>
                         <p className="text-sm text-muted-foreground whitespace-pre-wrap">({secondaryLangName}): {editableContent.secondary}</p>
                    </>
                 )}
            </CardFooter>
        </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Artisan's Workshop: <span className="font-bold">{offeringTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Generate, review, and approve AI-generated creatives for your offering.
            {sourcePlanItem && <div className="mt-1 font-medium text-primary">From Media Plan: "{sourcePlanItem.copy}"</div>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            <aside className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="funnel-select">Funnel (Optional)</Label>
                    <Select onValueChange={setSelectedFunnelId} disabled={isLoading}>
                        <SelectTrigger id="funnel-select">
                            <SelectValue placeholder="Select a funnel..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">No Funnel</SelectItem>
                            {funnels.map(funnel => (
                                <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <p className="text-xs text-muted-foreground">Select a funnel to provide more context to the AI.</p>
                </div>
                <div>
                    <h3 className="font-semibold mb-4">Creative Types</h3>
                     <RadioGroup 
                        value={selectedCreativeType} 
                        onValueChange={(value) => setSelectedCreativeType(value as CreativeType)}
                        className="space-y-3"
                        disabled={isLoading}
                    >
                        {creativeOptions.map(({ id, label, icon: Icon }) => (
                            <div key={id} className="flex items-center space-x-2">
                                <RadioGroupItem value={id} id={id} />
                                <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
                                    <Icon /> {label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
                <Button onClick={handleGenerate} className="w-full" disabled={isLoading || isSaving}>
                    {isLoading ? 'Generating...' : 'Generate Creatives'}
                </Button>
                
                 {(editableContent?.primary || creative?.imageUrl) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Text</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <Label className="text-muted-foreground">{primaryLangName} Post</Label>
                                <Textarea 
                                    value={editableContent?.primary || ''}
                                    onChange={(e) => handleContentChange('primary', e.target.value)}
                                    className="h-32 resize-none mt-1"
                                    placeholder="Primary content..."
                                />
                            </div>
                            {secondaryLangName && (
                                <div>
                                     <Label className="text-muted-foreground">{secondaryLangName} Post</Label>
                                    <Textarea 
                                        value={editableContent?.secondary || ''}
                                        onChange={(e) => handleContentChange('secondary', e.target.value)}
                                        className="h-32 resize-none mt-1"
                                        placeholder="Secondary content..."
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                 )}

            </aside>
            <main className="flex items-center justify-center max-h-[70vh] overflow-y-auto">
                <SocialPostPreview />
            </main>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={isLoading || isSaving || (!editableContent && !creative)}>
            {isSaving ? 'Approving...' : 'Approve & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    