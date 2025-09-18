

'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getOfferings } from '../offerings/actions';
import { generateContentForOffering, saveContent, generateCreativeForOffering, getQueueItems, updateQueueItemStatus } from './actions';
import type { Offering } from '../offerings/actions';
import type { QueueItem } from './actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Image as ImageIcon, Video, Layers, Type, Heart, MessageCircle, Send, Bookmark, CornerDownLeft, Wifi, Signal, Battery, ChevronLeft, MoreHorizontal, X, Music, CheckCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';


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

const dimensionMap = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
};

// --- Standalone SocialPostPreview Component ---
const StoryPreview = ({
    profile,
    isLoading,
    creative,
    editableContent,
    handleContentChange,
}: {
    profile: Profile,
    isLoading: boolean,
    creative: GenerateCreativeOutput | null,
    editableContent: GenerateContentOutput['content'] | null,
    handleContentChange: (language: 'primary' | 'secondary', value: string) => void,
}) => {
     const postUser = profile?.full_name || 'Your Brand';
    const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');

    return (
        <div className="w-full max-w-[280px] mx-auto sticky top-8">
            <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-lg bg-black">
                {/* Background Image/Video Placeholder */}
                {isLoading ? (
                    <Skeleton className="w-full h-full" />
                ) : (
                    creative?.imageUrl ? (
                        <Image src={creative.imageUrl} alt="Story preview" layout="fill" objectFit="cover" />
                    ) : (
                         <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <ImageIcon className="w-24 h-24 text-zinc-300 dark:text-zinc-600" />
                        </div>
                    )
                )}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col p-3 text-white bg-gradient-to-t from-black/50 via-transparent to-black/50">
                    {/* Header */}
                    <div className="flex-shrink-0">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="flex-1 h-1 bg-white/20 rounded-full">
                                <div className="h-1 bg-white rounded-full w-1/3"></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url || undefined} alt={postUser} />
                                <AvatarFallback>{postUser.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-bold">{postUserHandle}</span>
                            <span className="text-xs text-white/70">1h</span>
                             <MoreHorizontal className="ml-auto h-5 w-5" />
                            <X className="h-5 w-5" />
                        </div>
                    </div>
                    
                    {/* Editable Text Area */}
                    <div className="flex-1 flex items-center justify-center">
                        <Textarea
                            value={editableContent?.primary || ''}
                            onChange={(e) => handleContentChange('primary', e.target.value)}
                            className="w-full text-2xl font-bold text-center border-none focus-visible:ring-0 p-4 h-auto resize-none bg-transparent shadow-lg [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]"
                            placeholder="Your story text..."
                        />
                    </div>
                    
                    {/* Footer */}
                     <div className="flex-shrink-0 flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Send message"
                            className="flex-1 bg-black/30 backdrop-blur-sm border border-white/40 rounded-full px-4 py-2 text-sm placeholder:text-white/70 focus:ring-1 focus:ring-white outline-none"
                        />
                         <Heart className="h-6 w-6 cursor-pointer" />
                        <Send className="h-6 w-6 cursor-pointer" />
                    </div>
                </div>
            </div>
        </div>
    )
}
const SocialPostPreview = ({
    profile,
    dimension,
    isLoading,
    selectedCreativeType,
    creative,
    editableContent,
    secondaryLangName,
    handleContentChange,
    handleCarouselSlideChange,
}: {
    profile: Profile,
    dimension: keyof typeof dimensionMap,
    isLoading: boolean,
    selectedCreativeType: CreativeType,
    creative: GenerateCreativeOutput | null,
    editableContent: GenerateContentOutput['content'] | null,
    secondaryLangName: string | null,
    handleContentChange: (language: 'primary' | 'secondary', value: string) => void,
    handleCarouselSlideChange: (index: number, newText: string) => void,
}) => {
    const postUser = profile?.full_name || 'Your Brand';
    const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');
    const aspectRatioClass = dimensionMap[dimension];

    if (dimension === '9:16') {
        return (
            <StoryPreview
                profile={profile}
                isLoading={isLoading}
                creative={creative}
                editableContent={editableContent}
                handleContentChange={handleContentChange}
            />
        )
    }

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
                    <Skeleton className={cn("w-full", aspectRatioClass)} />
                ) : (
                    <>
                        {selectedCreativeType === 'image' && creative?.imageUrl && (
                            <div className={cn("relative w-full", aspectRatioClass)}>
                                <Image src={creative.imageUrl} alt="Generated creative" fill className="object-cover" />
                            </div>
                        )}
                        {selectedCreativeType === 'carousel' && creative?.carouselSlides && (
                            <Carousel>
                                <CarouselContent>
                                    {creative.carouselSlides.map((slide, index) => (
                                        <CarouselItem key={index}>
                                            <div className={cn("relative w-full", aspectRatioClass)}>
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
                            <div className={cn("p-4 text-sm text-muted-foreground bg-secondary flex flex-col justify-center", aspectRatioClass)}>
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


export default function ArtisanPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
    const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);

    const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('image');
    const [dimension, setDimension] = useState<keyof typeof dimensionMap>('1:1');
    const [creativePrompt, setCreativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);


    const handleQueueItemSelect = useCallback((queueItemId: string, items: QueueItem[]) => {
        setSelectedQueueItemId(queueItemId);
        if (queueItemId === 'custom') {
            setCreativePrompt('');
            setEditableContent(null);
            setCreative(null);
            setSelectedOfferingId(null);
            return;
        }

        const item = items.find(q => q.id === queueItemId);
        if (item) {
            setCreativePrompt(item.source_plan_item.creativePrompt || '');
            setEditableContent({ primary: item.source_plan_item.copy || '', secondary: null });
            setSelectedOfferingId(item.source_plan_item.offeringId);

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
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [profileData, queueData, offeringsData] = await Promise.all([
                    getProfile(),
                    getQueueItems(),
                    getOfferings(),
                ]);
                setProfile(profileData);
                setQueueItems(queueData);
                setOfferings(offeringsData);
                
                if (queueData.length > 0) {
                    handleQueueItemSelect(queueData[0].id, queueData);
                } else {
                    handleQueueItemSelect('custom', []);
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [toast, handleQueueItemSelect]);

    const handleGenerate = async () => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Please select an offering for your custom creative.' });
            return;
        }

        setIsLoading(true);
        setCreative(null);

        try {
            const creativeTypes: CreativeType[] = [selectedCreativeType];

            const promises = [];
            
            const visualBasedSelected = creativeTypes.includes('image') || creativeTypes.includes('video') || creativeTypes.includes('carousel');
            if (visualBasedSelected) {
                const creativeTypesForFlow = creativeTypes.filter(t => t !== 'text') as ('image' | 'carousel' | 'video')[];
                if (creativeTypesForFlow.length > 0) {
                    const creativePromise = generateCreativeForOffering({
                        offeringId: selectedOfferingId,
                        creativeTypes: creativeTypesForFlow,
                        aspectRatio: dimension,
                    });
                    promises.push(creativePromise);
                }
            }

            const results = await Promise.all(promises);

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
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Offering ID is missing.' });
            return;
        }
        if (!editableContent && !creative) {
            toast({ variant: 'destructive', title: 'Error', description: 'No content to save.' });
            return;
        }
        const currentQueueItem = queueItems.find(item => item.id === selectedQueueItemId) || null;

        startSaving(async () => {
            try {
                await saveContent({
                    offeringId: selectedOfferingId,
                    contentBody: editableContent,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoScript: creative?.videoScript || null,
                    status: 'approved',
                    sourcePlan: currentQueueItem?.source_plan_item || null,
                });
                if (currentQueueItem) {
                    await updateQueueItemStatus(currentQueueItem.id, 'completed');
                }
                toast({
                    title: 'Approved!',
                    description: 'The content has been saved and is ready for the calendar.',
                });
                
                // Refresh queue and move to next item
                const updatedQueue = await getQueueItems();
                setQueueItems(updatedQueue);
                if (updatedQueue.length > 0) {
                    handleQueueItemSelect(updatedQueue[0].id, updatedQueue);
                } else {
                    handleQueueItemSelect('custom', []);
                }

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
                                    <Label htmlFor="queue-select">1. Choose an Item or Go Custom</Label>
                                    <Select onValueChange={(value) => handleQueueItemSelect(value, queueItems)} disabled={isLoading} value={selectedQueueItemId || ''}>
                                        <SelectTrigger id="queue-select">
                                            <SelectValue placeholder="Select a content idea..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="custom">Custom AI Creative</SelectItem>
                                            <Separator className="my-1"/>
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
                                
                                {selectedQueueItemId === 'custom' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="offering-select">2. Choose an Offering</Label>
                                        <Select onValueChange={setSelectedOfferingId} disabled={isLoading}>
                                            <SelectTrigger id="offering-select">
                                                <SelectValue placeholder="Select an offering..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {offerings.map(o => (
                                                    <SelectItem key={o.id} value={o.id}>{o.title.primary}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="creative-prompt">{selectedQueueItemId === 'custom' ? '3.' : '2.'} AI Creative Prompt</Label>
                                    <Textarea
                                        id="creative-prompt"
                                        value={creativePrompt}
                                        onChange={(e) => setCreativePrompt(e.target.value)}
                                        placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                                        className="h-24 mt-1 resize-none"
                                    />
                                </div>

                                <div>
                                    <h3 className="font-medium mb-4">{selectedQueueItemId === 'custom' ? '4.' : '3.'} Creative Type</h3>
                                    <RadioGroup
                                        value={selectedCreativeType}
                                        onValueChange={(value) => setSelectedCreativeType(value as CreativeType)}
                                        className="grid grid-cols-2 gap-4"
                                        disabled={isLoading}
                                    >
                                        {creativeOptions.map(({ id, label, icon: Icon }) => (
                                            <div key={id} className="flex items-center space-x-2">
                                                <RadioGroupItem value={id} id={id} />
                                                <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer font-normal">
                                                    <Icon /> {label}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dimension-select">{selectedQueueItemId === 'custom' ? '5.' : '4.'} Dimensions</Label>
                                    <Select onValueChange={(v) => setDimension(v as keyof typeof dimensionMap)} disabled={isLoading} value={dimension}>
                                        <SelectTrigger id="dimension-select">
                                            <SelectValue placeholder="Select dimensions..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1:1">Square (1:1)</SelectItem>
                                            <SelectItem value="4:5">Portrait (4:5)</SelectItem>
                                            <SelectItem value="9:16">Story (9:16)</SelectItem>
                                            <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </CardContent>
                             <CardFooter className="flex-col gap-4">
                                <Button onClick={handleGenerate} className="w-full" disabled={isLoading || isSaving || !selectedOfferingId}>
                                    {isLoading ? 'Generating...' : 'Regenerate'}
                                </Button>
                                <Button onClick={handleApprove} variant="outline" className="w-full" disabled={isLoading || isSaving || (!editableContent && !creative)}>
                                    {isSaving ? 'Approving...' : 'Approve & Save'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </aside>
                    <main>
                         <SocialPostPreview
                            profile={profile}
                            dimension={dimension}
                            isLoading={isLoading}
                            selectedCreativeType={selectedCreativeType}
                            creative={creative}
                            editableContent={editableContent}
                            secondaryLangName={secondaryLangName}
                            handleContentChange={handleContentChange}
                            handleCarouselSlideChange={handleCarouselSlideChange}
                        />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}

    