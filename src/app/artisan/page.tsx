
'use client';

import { useEffect, useState, useTransition } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateContentForOffering, saveContent, generateCreativeForOffering, getQueueItems, updateQueueItemStatus } from './actions';
import type { QueueItem } from './actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Image as ImageIcon, Video, Layers, Type, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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

export default function ArtisanPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
    const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);
    
    const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('image');
    const [creativePrompt, setCreativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const selectedQueueItem = queueItems.find(item => item.id === selectedQueueItemId) || null;

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [profileData, queueData] = await Promise.all([
                    getProfile(),
                    getQueueItems(),
                ]);
                setProfile(profileData);
                setQueueItems(queueData);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [toast]);

    const handleQueueItemSelect = (queueItemId: string) => {
        setSelectedQueueItemId(queueItemId);
        const item = queueItems.find(q => q.id === queueItemId);
        if (item) {
            setCreativePrompt(item.source_plan_item.creativePrompt || '');
            setEditableContent({ primary: item.source_plan_item.copy || '', secondary: null });

            const format = item.source_plan_item.format.toLowerCase();
            if (format.includes('video')) setSelectedCreativeType('video');
            else if (format.includes('carousel')) setSelectedCreativeType('carousel');
            else if (format.includes('image')) setSelectedCreativeType('image');
            else setSelectedCreativeType('text');
        } else {
             setCreativePrompt('');
             setEditableContent(null);
        }
        setCreative(null);
    }

    const handleGenerate = async () => {
        if (!selectedQueueItem) {
            toast({ variant: 'destructive', title: 'Please select an item from the queue first.' });
            return;
        }

        setIsLoading(true);
        setCreative(null);
        
        try {
            const creativeTypes: CreativeType[] = [selectedCreativeType];
            let finalCreativeOutput: GenerateCreativeOutput = {};
            
            const promises = [];
            const offeringId = selectedQueueItem.source_plan_item.offeringId;

            // Always generate new text content based on the latest context
            const contentPromise = generateContentForOffering({ offeringId });
            promises.push(contentPromise);

            // Generate visuals if needed
            const visualBasedSelected = creativeTypes.includes('image') || creativeTypes.includes('video') || creativeTypes.includes('carousel');
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
            if (contentResult) setEditableContent(contentResult.content);
            
            if (visualBasedSelected) {
                const creativeResult = results.find(r => r && ('imageUrl' in r || 'videoScript' in r || 'carouselSlides' in r)) as GenerateCreativeOutput | undefined;
                if (creativeResult) setCreative(creativeResult);
            }

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

    const handleCarouselSlideChange = (index: number, newText: string) => {
        setCreative(prev => {
            if (!prev || !prev.carouselSlides) return prev;
            const newSlides = [...prev.carouselSlides];
            newSlides[index] = { ...newSlides[index], body: newText };
            return { ...prev, carouselSlides: newSlides };
        });
    };

    const handleApprove = () => {
        if (!selectedQueueItem) {
            toast({ variant: 'destructive', title: 'Error', description: 'Queue item is missing.' });
            return;
        }
        if (!editableContent && !creative) {
            toast({ variant: 'destructive', title: 'Error', description: 'No content to save.' });
            return;
        }
        
        startSaving(async () => {
            try {
                await saveContent({
                    offeringId: selectedQueueItem.source_plan_item.offeringId,
                    contentBody: editableContent,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoScript: creative?.videoScript || null,
                    status: 'approved',
                    sourcePlan: selectedQueueItem.source_plan_item,
                });
                await updateQueueItemStatus(selectedQueueItem.id, 'completed');
                toast({
                    title: 'Approved!',
                    description: 'The content has been saved and is ready for the calendar.',
                });
                // Refresh queue
                const updatedQueue = await getQueueItems();
                setQueueItems(updatedQueue);
                setSelectedQueueItemId(null);
                setCreativePrompt('');
                setEditableContent(null);
                setCreative(null);

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
            <Card className="w-full max-w-md mx-auto sticky top-24">
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
                            {selectedCreativeType === 'carousel' && creative?.carouselSlides && (
                                <Carousel>
                                    <CarouselContent>
                                        {creative.carouselSlides.map((slide, index) => (
                                            <CarouselItem key={index}>
                                                <div className="relative aspect-square w-full">
                                                    {slide.imageUrl ? (
                                                        <Image src={slide.imageUrl} alt={slide.title} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                                                            <ImageIcon className="w-16 h-16 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {creative.carouselSlides.length > 1 && (
                                        <>
                                        <CarouselPrevious className="left-2" />
                                        <CarouselNext className="right-2" />
                                        </>
                                    )}
                                </Carousel>
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
                    <Textarea 
                        value={editableContent?.primary || ''}
                        onChange={(e) => handleContentChange('primary', e.target.value)}
                        className="w-full text-sm border-none focus-visible:ring-0 p-0 h-auto resize-none bg-transparent"
                        placeholder="Your post copy will appear here..."
                    />
                    {secondaryLangName && editableContent?.secondary && (
                        <>
                            <Separator className="my-2"/>
                            <Textarea 
                                value={editableContent?.secondary || ''}
                                onChange={(e) => handleContentChange('secondary', e.target.value)}
                                className="w-full text-sm border-none focus-visible:ring-0 p-0 h-auto resize-none bg-transparent"
                                placeholder="Your secondary language post copy..."
                            />
                        </>
                    )}
                    {selectedCreativeType === 'carousel' && creative?.carouselSlides && (
                        <div className="w-full mt-2 space-y-2">
                            <h4 className="font-semibold text-sm">Carousel Slide Text:</h4>
                            {creative.carouselSlides.map((slide, index) => (
                                <div key={index} className="space-y-1">
                                    <Label htmlFor={`slide-${index}`} className="text-xs font-bold">{slide.title}</Label>
                                    <Textarea 
                                        id={`slide-${index}`}
                                        value={slide.body}
                                        onChange={(e) => handleCarouselSlideChange(index, e.target.value)}
                                        className="w-full text-sm border-none focus-visible:ring-0 p-0 h-auto resize-none bg-transparent"
                                        placeholder={`Text for slide ${index + 1}...`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardFooter>
            </Card>
        );
    }

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Wand2 className="h-8 w-8 text-primary" />
                        AI Artisan
                    </h1>
                    <p className="text-muted-foreground">The workshop for generating all your creative content from your media plan.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <aside className="space-y-8">
                        <Card>
                             <CardHeader>
                                <CardTitle>Creative Controls</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="queue-select">1. Choose an Item from the Queue</Label>
                                    <Select onValueChange={handleQueueItemSelect} disabled={isLoading} value={selectedQueueItemId || ''}>
                                        <SelectTrigger id="queue-select">
                                            <SelectValue placeholder="Select a content idea..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                             queueItems.length > 0 ? (
                                                queueItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>{item.source_plan_item.conceptualStep.concept}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>No pending items in queue.</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div>
                                    <Label htmlFor="creative-prompt">2. AI Creative Prompt</Label>
                                    <Textarea
                                        id="creative-prompt"
                                        value={creativePrompt}
                                        onChange={(e) => setCreativePrompt(e.target.value)}
                                        placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                                        className="h-24 mt-1 resize-none"
                                    />
                                </div>

                                <div>
                                    <h3 className="font-medium mb-4">3. Creative Type</h3>
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
                             </CardContent>
                             <CardFooter className="flex-col gap-4">
                                <Button onClick={handleGenerate} className="w-full" disabled={isLoading || isSaving || !selectedQueueItemId}>
                                    {isLoading ? 'Generating...' : 'Generate Creatives'}
                                </Button>
                                <Button onClick={handleApprove} variant="outline" className="w-full" disabled={isLoading || isSaving || (!editableContent && !creative)}>
                                    {isSaving ? 'Approving...' : 'Approve & Save'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </aside>
                    <main>
                        <SocialPostPreview />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
