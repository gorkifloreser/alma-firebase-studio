
'use client';

import { useEffect, useState, useTransition } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateContentForOffering, saveContent, generateCreativeForOffering, getOfferings, getFunnels, Offering, Funnel } from './actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
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
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
    
    const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('image');
    const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
    const [creativePrompt, setCreativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    useEffect(() => {
        async function fetchData() {
            try {
                const [profileData, offeringsData, funnelsData] = await Promise.all([
                    getProfile(),
                    getOfferings(),
                    getFunnels(),
                ]);
                setProfile(profileData);
                setOfferings(offeringsData);
                setFunnels(funnelsData);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
            }
        }
        fetchData();
    }, [toast]);

    const handleGenerate = async () => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Please select an offering first.' });
            return;
        }

        setIsLoading(true);
        setEditableContent(null);
        setCreative(null);
        
        try {
            const creativeTypes: CreativeType[] = [selectedCreativeType];
            
            let finalCreativeOutput: GenerateCreativeOutput = {};
            let finalContentOutput: GenerateContentOutput['content'] | null = null;

            const visualBasedSelected = creativeTypes.includes('image') || creativeTypes.includes('video') || creativeTypes.includes('carousel');
            const promises = [];
            
            const contentPromise = generateContentForOffering({ offeringId: selectedOfferingId, funnelId: selectedFunnelId });
            promises.push(contentPromise);

            if (visualBasedSelected) {
                const creativeTypesForFlow = creativeTypes.filter(t => t !== 'text') as ('image' | 'carousel' | 'video')[];
                if (creativeTypesForFlow.length > 0) {
                    const creativePromise = generateCreativeForOffering({ 
                        offeringId: selectedOfferingId, 
                        creativeTypes: creativeTypesForFlow
                    });
                    promises.push(creativePromise);
                }
            }
        
            const results = await Promise.all(promises);

            const contentResult = results.find(r => r && 'content' in r) as GenerateContentOutput | undefined;
            if (contentResult) finalContentOutput = contentResult.content;
            
            if (visualBasedSelected) {
                const creativeResult = results.find(r => r && ('imageUrl' in r || 'videoScript' in r || 'carouselSlides' in r)) as GenerateCreativeOutput | undefined;
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
        
        startSaving(async () => {
            try {
                await saveContent({
                    offeringId: selectedOfferingId,
                    contentBody: editableContent,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoScript: creative?.videoScript || null,
                    status: 'approved',
                });
                toast({
                    title: 'Approved!',
                    description: 'The content has been saved and is ready for the calendar.',
                });
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
                    <p className="text-muted-foreground">The workshop for generating all your creative content.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <aside className="space-y-8">
                        <Card>
                             <CardHeader>
                                <CardTitle>Creative Controls</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="offering-select">1. Choose an Offering</Label>
                                    <Select onValueChange={setSelectedOfferingId} disabled={isLoading}>
                                        <SelectTrigger id="offering-select">
                                            <SelectValue placeholder="Select an offering..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {offerings.map(offering => (
                                                <SelectItem key={offering.id} value={offering.id}>{offering.title.primary}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="funnel-select">2. Funnel (Optional)</Label>
                                    <Select onValueChange={setSelectedFunnelId} disabled={isLoading || !selectedOfferingId}>
                                        <SelectTrigger id="funnel-select">
                                            <SelectValue placeholder="Select a funnel context..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Funnel</SelectItem>
                                            {funnels.filter(f => f.offering_id === selectedOfferingId).map(funnel => (
                                                <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Select a funnel to provide more context to the AI.</p>
                                </div>
                                
                                <div>
                                    <Label htmlFor="creative-prompt">3. AI Creative Prompt</Label>
                                    <Textarea
                                        id="creative-prompt"
                                        value={creativePrompt}
                                        onChange={(e) => setCreativePrompt(e.target.value)}
                                        placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                                        className="h-24 mt-1 resize-none"
                                    />
                                </div>

                                <div>
                                    <h3 className="font-medium mb-4">4. Creative Type</h3>
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
                                <Button onClick={handleGenerate} className="w-full" disabled={isLoading || isSaving || !selectedOfferingId}>
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

