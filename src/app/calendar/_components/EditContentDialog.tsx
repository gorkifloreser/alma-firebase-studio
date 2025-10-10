
      
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateContent, type CalendarItem, deleteContentItem, publishNow, SocialConnection, analyzePost, getActiveSocialConnection, rewritePost } from '../actions';
import type { PostAnalysis } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Send, Bookmark, Calendar as CalendarIcon, Trash2, SendHorizonal, Bot, Sparkles, Lightbulb, Instagram, Facebook, CheckCircle, AlertTriangle, Check, X, Film, PlusSquare, Image as ImageIcon } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, setHours, setMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';


interface EditContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contentItem: CalendarItem | null;
  onContentUpdated: (contentItem: CalendarItem) => void;
  onContentDeleted: (itemId: string) => void;
}

type Profile = {
    full_name: string | null;
    avatar_url: string | null;
    primary_language: string;
    secondary_language: string | null;
} | null;

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') };
});

const formatOptions = [
    { value: 'Post', label: 'Post', icon: ImageIcon, description: 'Standard publication' },
    { value: 'Reel', label: 'Reel', icon: Film, description: 'Automatic posting' },
    { value: 'Story', label: 'Story', icon: PlusSquare, description: 'Automatic posting' },
]

const parseCarouselSlides = (slides: any): any[] | null => {
    if (!slides) return null;
    if (Array.isArray(slides)) return slides;
    if (typeof slides === 'string') {
        try {
            const parsed = JSON.parse(slides);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            console.error("Failed to parse carousel_slides string:", e);
            return null;
        }
    }
    return null;
}

const ChannelIcon = ({ provider, imageUrl }: { provider: string, imageUrl?: string | null }) => {
    if (imageUrl) {
        return <AvatarImage src={imageUrl} className="w-full h-full object-cover" />;
    }
    if (provider.toLowerCase().includes('instagram')) return <Instagram className="h-5 w-5" />;
    if (provider.toLowerCase().includes('facebook')) return <Facebook className="h-5 w-5" />;
    return <Sparkles className="h-5 w-5" />;
};


export function EditContentDialog({
  isOpen,
  onOpenChange,
  contentItem,
  onContentUpdated,
  onContentDeleted,
}: EditContentDialogProps) {
  const [profile, setProfile] = useState<Profile>(null);
  const [activeConnection, setActiveConnection] = useState<SocialConnection | null>(null);

  const getInitialContent = () => {
    if (!contentItem) return { primary: '', secondary: '' };
    if (contentItem.content_body && (contentItem.content_body.primary || contentItem.content_body.secondary)) {
        return contentItem.content_body;
    }
    return {
        primary: contentItem.copy || '',
        secondary: contentItem.content_body?.secondary || '',
    };
  };

  const [editableContent, setEditableContent] = useState(getInitialContent());
  const [editableSlides, setEditableSlides] = useState(() => parseCarouselSlides(contentItem?.carousel_slides));
  const [editableScheduledAt, setEditableScheduledAt] = useState<Date | null>(null);
  const [editableHashtags, setEditableHashtags] = useState(contentItem?.hashtags || '');
  const [editableFormat, setEditableFormat] = useState<string | null>(contentItem?.format || 'Post');
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isRewriting, startRewriting] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<PostAnalysis | null>(null);
  const [suggestedRewrite, setSuggestedRewrite] = useState<string | null>(null);

  const { toast } = useToast();
  const languageNames = new Map(languages.map(l => [l.value, l.label]));


  useEffect(() => {
    async function fetchData() {
        if(isOpen) {
            setIsLoading(true);
            try {
                const [profileData, connectionData] = await Promise.all([
                    getProfile(),
                    getActiveSocialConnection()
                ]);
                setProfile(profileData);
                setActiveConnection(connectionData);
            } catch (error) {
                console.error("Failed to fetch initial data for dialog", error);
            } finally {
                setIsLoading(false);
            }
        }
    }
    fetchData();
  }, [isOpen, contentItem]);

  useEffect(() => {
    if (contentItem) {
        setEditableContent(getInitialContent());
        setEditableHashtags(contentItem.hashtags || '');
        setEditableSlides(parseCarouselSlides(contentItem.carousel_slides));
        setEditableScheduledAt(contentItem.scheduled_at ? parseISO(contentItem.scheduled_at) : null);
        setEditableFormat(contentItem.format || 'Post');
        setAnalysisResult(null);
        setSuggestedRewrite(null);
    }
  }, [contentItem]);
  
  if (!contentItem) return null;

  const handleContentChange = (language: 'primary' | 'secondary', value: string) => {
    setEditableContent(prev => ({
        primary: null,
        secondary: null,
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

  const handleDateTimeChange = (date: Date | undefined, time: string) => {
    if (!date) {
        setEditableScheduledAt(null);
        return;
    }
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    if (!isNaN(hours) && !isNaN(minutes)) {
        newDate.setHours(hours, minutes, 0, 0);
    }
    setEditableScheduledAt(newDate);
  };

  const handleSave = () => {
    startSaving(async () => {
      try {
        const updates: Partial<Pick<CalendarItem, 'copy' | 'content_body' | 'hashtags' | 'carousel_slides' | 'status' | 'scheduled_at' | 'user_channel_id' | 'format'>> = {};
        
        if (editableContent) {
            updates.content_body = editableContent;
            updates.copy = editableContent.primary;
        }
        if (editableHashtags) updates.hashtags = editableHashtags;
        if (editableSlides) updates.carousel_slides = editableSlides;
        if (activeConnection) updates.user_channel_id = activeConnection.id;
        if (editableFormat) updates.format = editableFormat;


        if (editableScheduledAt) {
            updates.scheduled_at = editableScheduledAt.toISOString();
            updates.status = 'scheduled';
        } else {
            updates.scheduled_at = null;
            if (contentItem.status === 'scheduled') {
                updates.status = 'approved';
            }
        }
        
        const updatedContent = await updateContent(contentItem.id, updates);
        onContentUpdated(updatedContent);
        onOpenChange(false);
        toast({ title: 'Success!', description: 'Your post has been updated.' });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to Save',
          description: error.message,
        });
      }
    });
  };

  const handleDelete = () => {
    startDeleting(async () => {
      try {
        await deleteContentItem(contentItem.id);
        onContentDeleted(contentItem.id);
        onOpenChange(false);
        toast({ title: 'Post Deleted', description: 'The content has been permanently removed.' });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Deletion Failed',
          description: error.message,
        });
      }
    });
  };

  const handlePublishNow = () => {
    startPublishing(async () => {
      try {
        const result = await publishNow(contentItem.id);
        const updatedItem = await updateContent(contentItem.id, { status: 'published', published_at: new Date().toISOString() });
        onContentUpdated(updatedItem);
        onOpenChange(false);
        toast({ title: 'Published!', description: 'Your content has been published successfully.' });
      } catch (error: any) {
         console.error('[handlePublishNow] Error publishing post:', error);
         toast({
          variant: 'destructive',
          title: 'Publish Failed',
          description: error.message,
        });
      }
    });
  };
  
  const handleAnalyzePost = () => {
    if (!editableContent?.primary) {
        toast({ variant: 'destructive', title: 'Cannot Analyze', description: 'There is no primary content to analyze.'});
        return;
    }
    startAnalyzing(async () => {
        setAnalysisResult(null);
        try {
            const result = await analyzePost({ postText: editableContent.primary!, hashtags: editableHashtags || '' });
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: "The AI has provided feedback on your post."});
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message });
        }
    });
  };
  
    const handleRewritePost = () => {
        if (!editableContent?.primary || !analysisResult?.suggestions) return;
        
        startRewriting(async () => {
            setSuggestedRewrite(null);
            try {
                const result = await rewritePost({
                    originalText: editableContent.primary!,
                    suggestions: analysisResult.suggestions.map(s => s.point),
                });
                setSuggestedRewrite(result.rewrittenText);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Rewrite Failed', description: error.message });
            }
        });
    };
    
    const acceptRewrite = () => {
        if (!suggestedRewrite) return;
        handleContentChange('primary', suggestedRewrite);
        setSuggestedRewrite(null);
        handleAnalyzePost();
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
        return null;
    };

  const primaryLangName = languageNames.get(profile?.primary_language || 'en') || 'Primary';
  const secondaryLangName = profile?.secondary_language ? languageNames.get(profile.secondary_language) || 'Secondary' : null;
  
  const postUser = activeConnection?.account_name || profile?.full_name || 'Your Brand';
  const postUserHandle = activeConnection?.account_name || (profile?.full_name || 'yourbrand').toLowerCase().replace(/\s/g, '');
  const postUserAvatar = activeConnection?.account_picture_url || profile?.avatar_url;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            For offering: <span className="font-semibold">{contentItem.offerings?.title?.primary || '...'}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-8 py-4 overflow-y-auto pr-6">
            <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Publishing to</Label>
                        {isLoading ? <Skeleton className="h-12 w-full" /> : activeConnection ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                 <Button variant='default' className="gap-2 h-12">
                                     <Avatar className="h-6 w-6">
                                        <ChannelIcon provider={activeConnection.provider} imageUrl={activeConnection.account_picture_url} />
                                     </Avatar>
                                     {activeConnection.account_name}
                                 </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No active social account. Please connect one in Accounts.</p>
                        )}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="format-select">Format</Label>
                        <Select value={editableFormat || undefined} onValueChange={setEditableFormat}>
                            <SelectTrigger id="format-select" className="h-12">
                                <SelectValue placeholder="Select a format..." />
                            </SelectTrigger>
                            <SelectContent>
                                {formatOptions.map(option => {
                                    const Icon = option.icon;
                                    return (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-semibold">{option.label}</p>
                                                    <p className="text-xs text-muted-foreground">{option.description}</p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                 <div className="space-y-2">
                    <Label htmlFor="post-copy">Post Copy</Label>
                    <Textarea 
                        id="post-copy"
                        value={editableContent?.primary || ''}
                        onChange={(e) => handleContentChange('primary', e.target.value)}
                        className="w-full text-sm min-h-[150px]"
                        placeholder="Your post copy will appear here..."
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="hashtags">Hashtags</Label>
                    <Input
                        id="hashtags"
                        value={editableHashtags || ''}
                        onChange={(e) => setEditableHashtags(e.target.value)}
                        placeholder="#hashtags #go #here"
                        className="text-sm"
                    />
                </div>
                 {editableSlides && editableSlides.length > 0 && (
                    <div className="w-full mt-2 space-y-4 pt-4 border-t">
                        <h4 className="font-semibold text-sm">Carousel Slide Text</h4>
                        {editableSlides.map((slide, index) => (
                            <div key={index} className="space-y-2">
                                <Label htmlFor={`slide-title-${index}`} className="text-xs font-bold">Slide {index + 1} Title</Label>
                                <Input
                                    id={`slide-title-${index}`}
                                    value={slide.title}
                                    onChange={(e) => handleCarouselSlideChange(index, 'title', e.target.value)}
                                    className="w-full text-sm"
                                    placeholder={`Title for slide ${index + 1}...`}
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
                 <div className="pt-4">
                    <Accordion type="single" collapsible>
                        <AccordionItem value="item-1" className="border-b-0">
                           <AccordionTrigger
                                className={cn(buttonVariants({ variant: "outline" }), "w-full hover:no-underline")}
                                onClick={!analysisResult ? handleAnalyzePost : undefined}
                                disabled={isAnalyzing}
                            >
                                <Bot className="mr-2 h-4 w-4" />
                                {isAnalyzing ? 'Analyzing...' : 'Rate post with AI'}
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                               {isAnalyzing ? <Skeleton className="h-40 w-full" /> : analysisResult && (
                                    <Card className="border-border">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-primary" />
                                                AI Analysis
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold text-primary">{analysisResult.overall_score}</span>
                                                <span className="text-sm text-muted-foreground">/ 10</span>
                                            </div>
                                            </div>
                                            <CardDescription>{analysisResult.reasoning}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">Strengths</h4>
                                                <ul className="space-y-2">
                                                {analysisResult.strengths.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                                        <span>{item.point}</span>
                                                    </li>
                                                ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">Suggestions</h4>
                                                <ul className="space-y-2">
                                                {analysisResult.suggestions.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                                                        <span>{item.point}</span>
                                                    </li>
                                                ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-4 flex-col items-stretch gap-4">
                                            {suggestedRewrite ? (
                                                <div className="space-y-2 w-full">
                                                    <Label className="font-semibold">Suggested Rewrite</Label>
                                                    <Textarea
                                                        value={suggestedRewrite}
                                                        onChange={(e) => setSuggestedRewrite(e.target.value)}
                                                        className="h-32 bg-secondary"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setSuggestedRewrite(null)}><X className="mr-2 h-4 w-4"/> Reject</Button>
                                                        <Button size="sm" onClick={acceptRewrite}><Check className="mr-2 h-4 w-4"/> Accept</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button variant="secondary" onClick={handleRewritePost} disabled={isRewriting}>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    {isRewriting ? 'Improving...' : 'Improve with AI'}
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                 </div>
            </div>

            <div className="md:col-span-2 space-y-4 sticky top-0">
                <Card className="w-full max-w-sm mx-auto">
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                        {isLoading ? <Skeleton className="h-10 w-10 rounded-full" /> : (
                            <Avatar>
                                <AvatarImage src={postUserAvatar || undefined} alt={postUser} />
                                <AvatarFallback>{postUser.charAt(0)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="grid gap-0.5">
                            {isLoading ? (
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
                    <CardFooter className="flex justify-between w-full pt-2">
                         <div className="flex gap-4">
                                <Heart className="h-6 w-6 cursor-pointer hover:text-red-500" />
                                <MessageCircle className="h-6 w-6 cursor-pointer hover:text-primary" />
                                <Send className="h-6 w-6 cursor-pointer hover:text-primary" />
                            </div>
                            <Bookmark className="h-6 w-6 cursor-pointer hover:text-primary" />
                    </CardFooter>
                </Card>
            </div>
        </div>

        <DialogFooter className="justify-between pt-4 border-t">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : <Trash2 className="h-4 w-4" />}
                     </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this post.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          <div className="flex gap-2 items-center">
             <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-[150px] justify-start text-left font-normal", !editableScheduledAt && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editableScheduledAt ? format(editableScheduledAt, "MMM d") : <span>Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={editableScheduledAt || undefined}
                            onSelect={(d) => handleDateTimeChange(d, editableScheduledAt ? format(editableScheduledAt, 'HH:mm') : '09:00')}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                 <Select
                    value={editableScheduledAt ? format(editableScheduledAt, 'HH:mm') : ''}
                    onValueChange={(time) => handleDateTimeChange(editableScheduledAt || new Date(), time)}
                >
                    <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                        {timeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <Button onClick={handleSave} disabled={isSaving || isPublishing}>
                {isSaving ? 'Saving...' : 'Save & Schedule'}
             </Button>
             <Button variant="secondary" onClick={handlePublishNow} disabled={isPublishing || isSaving}>
                 {isPublishing ? 'Publishing...' : <SendHorizonal className="mr-2 h-4 w-4" />}
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    