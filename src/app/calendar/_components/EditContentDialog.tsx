

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { CarouselSlide } from '@/ai/flows/generate-creative-flow';


interface EditContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contentItem: ContentItem | null;
  onContentUpdated: (contentItem: ContentItem) => void;
}

type Profile = {
    full_name: string | null;
    avatar_url: string | null;
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
  const [editableSlides, setEditableSlides] = useState(contentItem?.carousel_slides);
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
        setEditableSlides(contentItem.carousel_slides);
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

  const handleCarouselSlideChange = (index: number, field: 'title' | 'body', value: string) => {
    setEditableSlides(prev => {
        if (!prev) return null;
        const newSlides = [...prev];
        const slideToUpdate = { ...newSlides[index] };
        (slideToUpdate as any)[field] = value;
        newSlides[index] = slideToUpdate;
        return newSlides;
    });
  };

  const handleSave = () => {
    if (!editableContent && !editableSlides) return;
    
    startSaving(async () => {
      try {
        const updates: {
            content_body?: typeof editableContent;
            carousel_slides?: typeof editableSlides;
        } = {};
        if (editableContent) updates.content_body = editableContent;
        if (editableSlides) updates.carousel_slides = editableSlides;

        const updatedContent = await updateContent(contentItem.id, updates);
        onContentUpdated(updatedContent);
        onOpenChange(false);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to Save',
          description: error.message,
        });
      }
    });
  };
  
    const renderVisualContent = () => {
        if (editableSlides && Array.isArray(editableSlides) && editableSlides.length > 0) {
            return (
                <Carousel className="w-full h-full">
                    <CarouselContent>
                        {editableSlides.map((slide: any, index: number) => (
                            <CarouselItem key={index} className="relative w-full h-full">
                                {slide.imageUrl ? (
                                    <Image src={slide.imageUrl} alt={slide.title || `Slide ${index}`} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                                        <p className="text-muted-foreground text-center p-4">Slide {index + 1}:<br/>{slide.title}</p>
                                    </div>
                                )}
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {editableSlides.length > 1 && (
                        <>
                           <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 z-10" />
                            <CarouselNext className="right-4 top-1/2 -translate-y-1/2 z-10" />
                        </>
                    )}
                </Carousel>
            );
        }
        if (contentItem.image_url) {
            return <Image src={contentItem.image_url} alt="Generated creative" fill className="object-cover" />;
        }
        if (contentItem.video_url) {
            return (
                <video
                    src={contentItem.video_url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                />
            );
        }
        return null; // No visual content
    };

  const secondaryLangName = profile?.secondary_language ? languageNames.get(profile.secondary_language) || 'Secondary' : null;
  const postUser = profile?.full_name || 'Your Brand';
  const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            For offering: <span className="font-semibold">{contentItem.offerings?.title?.primary || '...'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-4">
             <Card className="w-full max-w-md mx-auto">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    {isLoadingProfile ? <Skeleton className="h-10 w-10 rounded-full" /> : (
                        <Avatar>
                            <AvatarImage src={profile?.avatar_url || undefined} alt={postUser} />
                            <AvatarFallback>{postUser.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <div className="grid gap-0.5">
                        {isLoadingProfile ? (
                            <>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16 mt-1" />
                            </>
                        ) : (
                            <>
                                <span className="font-semibold">{postUser}</span>
                                <span className="text-xs text-muted-foreground">@{postUserHandle}</span>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative aspect-square w-full overflow-hidden bg-secondary">
                       {renderVisualContent()}
                    </div>
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
                     <Textarea 
                        value={editableContent?.primary || ''}
                        onChange={(e) => handleContentChange('primary', e.target.value)}
                        className="w-full text-sm border-none focus-visible:ring-0 p-0 h-auto resize-none bg-transparent"
                        placeholder="Your post copy will appear here..."
                    />
                     {secondaryLangName && (
                        <>
                            <Separator className="my-2"/>
                            <Textarea 
                                value={editableContent?.secondary || ''}
                                onChange={(e) => handleContentChange('secondary', e.target.value)}
                                className="w-full text-sm border-none focus-visible:ring-0 p-0 h-auto resize-none bg-transparent text-muted-foreground"
                                placeholder={`Your ${secondaryLangName} post copy...`}
                            />
                        </>
                     )}
                      {editableSlides && editableSlides.length > 0 && (
                        <div className="w-full mt-2 space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-sm">Carousel Slide Text</h4>
                            {editableSlides.map((slide, index) => (
                                <div key={index} className="space-y-2">
                                    <Label htmlFor={`slide-title-${index}`} className="text-xs font-bold">Slide {index + 1} Title</Label>
                                    <Textarea
                                        id={`slide-title-${index}`}
                                        value={slide.title}
                                        onChange={(e) => handleCarouselSlideChange(index, 'title', e.target.value)}
                                        className="w-full text-sm"
                                        placeholder={`Title for slide ${index + 1}...`}
                                        rows={1}
                                    />
                                    <Label htmlFor={`slide-body-${index}`} className="text-xs font-bold">Slide {index + 1} Body</Label>
                                    <Textarea
                                        id={`slide-body-${index}`}
                                        value={slide.body}
                                        onChange={(e) => handleCarouselSlideChange(index, 'body', e.target.value)}
                                        className="w-full text-sm"
                                        placeholder={`Body text for slide ${index + 1}...`}
                                        rows={2}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardFooter>
            </Card>
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

