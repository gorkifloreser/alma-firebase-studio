

'use client';

import { useEffect, useState, useTransition, useCallback, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getOfferings, uploadSingleOfferingMedia, deleteOfferingMedia } from '../offerings/actions';
import { generateCreativeForOffering, saveContent, getQueueItems, updateQueueItemStatus, generateCreativePrompt, editImageWithInstruction, regenerateCarouselSlide } from './actions';
import { getMediaPlans, getMediaPlanItems } from '../funnels/actions';
import { getArtStyles, ArtStyle } from '../art-styles/actions';
import type { Offering, OfferingMedia } from '../offerings/actions';
import type { QueueItem } from './actions';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Image as ImageIcon, Video, Layers, Type, Heart, MessageCircle, Send, Bookmark, CornerDownLeft, MoreHorizontal, X, Play, Pause, Globe, Wifi, Battery, ArrowLeft, ArrowRight, Share, ExternalLink, MousePointerClick, Code, Copy, BookOpen, Edit, Calendar as CalendarIcon, Clock, Images, RefreshCw, UploadCloud, Loader2, Palette, Bot, User as UserIcon, Sparkles, ZoomIn, History, Download, CaseUpper } from 'lucide-react';
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, setHours, setMinutes, isValid, addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '../offerings/_components/ImageUpload';
import { getFormatsForChannel } from '@/lib/media-formats';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type Profile = {
    full_name: string | null;
    avatar_url: string | null;
    primary_language: string;
    secondary_language: string | null;
} | null;

type MediaPlanSelectItem = {
    id: string;
    title: string;
    offering_id: string;
    offering_title: string | null;
}

type CreativeType = 'image' | 'carousel' | 'video' | 'landing_page' | 'text';

const creativeOptions: { id: CreativeType, label: string, icon: React.ElementType }[] = [
    { id: 'text', label: 'Text Only', icon: Type },
    { id: 'image', label: 'Single Image', icon: ImageIcon },
    { id: 'carousel', label: 'Carousel', icon: Layers },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'landing_page', label: 'Landing Page', icon: Globe },
];

const dimensionMap = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
};


// --- Standalone PostPreview Component ---
const PostPreview = ({
    profile,
    dimension,
    isLoading,
    selectedCreativeType,
    creative,
    editableContent,
    secondaryLangName,
    isCodeEditorOpen,
    onCodeEditorToggle,
    handleContentChange,
    handleCarouselSlideChange,
    onImageEdit,
    onRegenerateClick,
    onCurrentSlideChange,
    onDownload,
    onSelectReferenceImage,
    onAddText,
}: {
    profile: Profile,
    dimension: keyof typeof dimensionMap,
    isLoading: boolean,
    selectedCreativeType: CreativeType,
    creative: GenerateCreativeOutput | null,
    editableContent: GenerateCreativeOutput['content'] | null,
    secondaryLangName: string | null,
    isCodeEditorOpen: boolean,
    onCodeEditorToggle: () => void,
    handleContentChange: (language: 'primary' | 'secondary', value: string) => void,
    handleCarouselSlideChange: (index: number, newText: string) => void,
    onImageEdit: (imageUrl: string, slideIndex?: number) => void;
    onRegenerateClick: () => void;
    onCurrentSlideChange: (index: number) => void;
    onDownload: (url: string, filename: string) => void;
    onSelectReferenceImage: () => void;
    onAddText: (imageUrl: string, slideIndex?: number) => void;
}) => {
    const postUser = profile?.full_name || 'Your Brand';
    const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');
    const aspectRatioClass = dimensionMap[dimension];
    const isStory = dimension === '9:16';
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    

    const togglePlay = () => {
        const video = videoRef.current;
        if (video) {
            if (video.paused) {
                video.play();
                setIsPlaying(true);
            } else {
                video.pause();
                setIsPlaying(false);
            }
        }
    };


    useEffect(() => {
        if (!api) return;
        const newCurrent = api.selectedScrollSnap();
        setCurrent(newCurrent);
        onCurrentSlideChange(newCurrent);
        api.on("select", () => {
            const newIndex = api.selectedScrollSnap();
            setCurrent(newIndex);
            onCurrentSlideChange(newIndex);
        });
    }, [api, onCurrentSlideChange]);
    
    const progressCount = creative?.carouselSlides?.length || 1;
    const currentSlideData = (selectedCreativeType === 'carousel' && creative?.carouselSlides) ? creative.carouselSlides[current] : null;
    
    const hasVisuals = (selectedCreativeType === 'image' && creative?.imageUrl) || (selectedCreativeType === 'carousel' && currentSlideData?.imageUrl) || (selectedCreativeType === 'video' && creative?.videoUrl);
    const imageUrlToEdit = selectedCreativeType === 'carousel' ? currentSlideData?.imageUrl : creative?.imageUrl;
    const urlToDownload = selectedCreativeType === 'video' ? creative?.videoUrl : imageUrlToEdit;


    const renderVisualContent = () => {
        if (isLoading) {
            return <Skeleton className="w-full h-full" />;
        }
        if (selectedCreativeType === 'carousel' && creative?.carouselSlides) {
            return (
                <Carousel setApi={setApi} className="w-full h-full">
                    <CarouselContent>
                        {creative.carouselSlides.map((slide, index) => (
                             <CarouselItem key={index} className="relative group">
                                <div className={cn("relative w-full overflow-hidden", aspectRatioClass)}>
                                    {slide.imageUrl ? (
                                        <Image src={slide.imageUrl} alt={slide.title || `Slide ${index}`} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                                            <ImageIcon className="w-24 h-24 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {(creative.carouselSlides.length > 1) && (
                        <>
                           <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 z-10" />
                            <CarouselNext className="right-4 top-1/2 -translate-y-1/2 z-10" />
                        </>
                    )}
                </Carousel>
            );
        }
        if (creative?.imageUrl) {
            return (
                 <div className="relative w-full h-full group">
                    <Image src={creative.imageUrl} alt="Generated creative" fill className="object-cover" />
                </div>
            );
        }
        if (selectedCreativeType === 'video' && creative?.videoUrl) {
            return (
                 <div className="relative w-full h-full">
                    <video
                        ref={videoRef}
                        src={creative.videoUrl}
                        className="w-full h-full object-cover"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        loop
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20" onClick={togglePlay}>
                        {!isPlaying && (
                            <div className="p-4 bg-black/50 rounded-full">
                                <Play className="h-8 w-8 text-white fill-white" />
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
            </div>
        );
    };
    
    if (selectedCreativeType === 'landing_page') {
        return (
             <div className="w-full max-w-md mx-auto">
                 <LandingPagePreview
                    htmlContent={creative?.landingPageHtml}
                    onCodeEditorToggle={onCodeEditorToggle}
                    isCodeEditorOpen={isCodeEditorOpen}
                />
            </div>
        );
    }


    if (isStory) {
        return (
            <TooltipProvider>
                <div className={cn("relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg text-white", aspectRatioClass)}>
                    <div className="absolute inset-0 bg-black">
                        {renderVisualContent()}
                    </div>
                    
                    {(hasVisuals || selectedCreativeType === 'video') && (
                        <div className="absolute top-16 right-4 flex flex-col gap-2 z-10 pointer-events-auto">
                            {imageUrlToEdit && (
                                <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => onAddText(imageUrlToEdit, selectedCreativeType === 'carousel' ? current : undefined)}>
                                            <CaseUpper className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Add Text</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => onImageEdit(imageUrlToEdit, selectedCreativeType === 'carousel' ? current : undefined)}>
                                            <Edit className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Retouch Image</p></TooltipContent>
                                </Tooltip>
                                </>
                            )}
                            {selectedCreativeType === 'video' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={onSelectReferenceImage}>
                                            <Images className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Create from Image</p></TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={onRegenerateClick}>
                                        <RefreshCw className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Regenerate Visual</p></TooltipContent>
                            </Tooltip>
                            {urlToDownload && (
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => onDownload(urlToDownload, 'alma-ai-creative')}>
                                            <Download className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Download</p></TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}
                    
                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col p-3 bg-gradient-to-t from-black/60 via-transparent to-black/60 pointer-events-none">
                        {/* Header */}
                        <div className="flex-shrink-0">
                            <div className="flex items-center gap-1 mb-2">
                                {[...Array(progressCount)].map((_, i) => (
                                    <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full">
                                        <div className={cn("h-full rounded-full bg-white transition-all duration-500", i === current ? "w-full" : "w-0")}></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={profile?.avatar_url || undefined} alt={postUser} />
                                    <AvatarFallback>{postUser.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-bold">{postUserHandle}</span>
                                <span className="text-xs text-white/70">1h</span>
                                <MoreHorizontal className="ml-auto h-5 w-5 pointer-events-auto cursor-pointer" />
                                <X className="h-5 w-5 pointer-events-auto cursor-pointer" />
                            </div>
                        </div>
                        
                        {/* Editable Text Area */}
                        <div className="flex-1 flex items-center justify-center p-4">
                        <Textarea
                                value={currentSlideData ? currentSlideData.body : (editableContent?.primary || '')}
                                onChange={(e) => {
                                    if (currentSlideData) {
                                        handleCarouselSlideChange(current, e.target.value)
                                    } else {
                                        handleContentChange('primary', e.target.value)
                                    }
                                }}
                                className="w-full text-2xl font-bold text-center border-none focus-visible:ring-0 p-2 h-auto resize-none bg-black/30 rounded-lg shadow-lg [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)] pointer-events-auto"
                                placeholder="Your story text..."
                            />
                        </div>
                        
                        {/* Footer */}
                        <div className="flex-shrink-0 flex items-center gap-2 pointer-events-auto">
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
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <div className="relative">
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
                        <div className={cn("relative w-full overflow-hidden bg-black flex items-center justify-center", dimension === '9:16' ? 'aspect-[4/5]' : aspectRatioClass)}>
                            <div className={cn("relative w-full h-full", dimension === '9:16' ? 'aspect-[9/16]' : '')}>
                                {renderVisualContent()}
                            </div>
                            {(hasVisuals || selectedCreativeType === 'video') && (
                                <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
                                    {imageUrlToEdit && (
                                        <>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={() => onAddText(imageUrlToEdit, selectedCreativeType === 'carousel' ? current : undefined)}><CaseUpper className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent side="left"><p>Add Text</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                            <TooltipTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={() => onImageEdit(imageUrlToEdit, selectedCreativeType === 'carousel' ? current : undefined)}><Edit className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent side="left"><p>Retouch Image</p></TooltipContent>
                                        </Tooltip>
                                        </>
                                    )}
                                    {selectedCreativeType === 'video' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={onSelectReferenceImage}><Images className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent side="left"><p>Create from Image</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Tooltip>
                                        <TooltipTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={onRegenerateClick}><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger>
                                        <TooltipContent side="left"><p>Regenerate Visual</p></TooltipContent>
                                    </Tooltip>
                                    {urlToDownload && (
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={() => onDownload(urlToDownload, 'alma-ai-creative')}><Download className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent side="left"><p>Download</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            )}
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
                            value={(selectedCreativeType === 'carousel' && currentSlideData) ? currentSlideData.body : (editableContent?.primary || '')}
                            onChange={(e) => {
                                if (selectedCreativeType === 'carousel' && currentSlideData) {
                                    handleCarouselSlideChange(current, e.target.value)
                                } else {
                                    handleContentChange('primary', e.target.value)
                                }
                            }}
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
                    </CardFooter>
                </Card>
            </div>
        </TooltipProvider>
    );
}

const LandingPagePreview = ({ htmlContent, onCodeEditorToggle, isCodeEditorOpen }: { htmlContent?: string | null, onCodeEditorToggle: () => void, isCodeEditorOpen: boolean }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);

    const goBack = () => iframeRef.current?.contentWindow?.history.back();
    const goForward = () => iframeRef.current?.contentWindow?.history.forward();
    
    const openInNewTab = () => {
        if (htmlContent) {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="w-full bg-zinc-900 shadow-2xl overflow-hidden border border-zinc-700 rounded-2xl flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-zinc-800 p-2">
                <div className="w-full h-8 bg-zinc-700 rounded-md flex items-center px-2 text-sm text-zinc-400 gap-2">
                    <button onClick={goBack} className="hover:text-white"><ArrowLeft size={16} /></button>
                    <button onClick={goForward} className="hover:text-white"><ArrowRight size={16} /></button>
                    <div className="flex-1 text-center bg-zinc-800 rounded-sm p-1 truncate text-zinc-300">
                        alma-ai.app/preview
                    </div>
                     <button
                        onClick={() => setIsSelectMode(!isSelectMode)}
                        className={cn("hover:text-white", isSelectMode && "text-blue-400")}
                        title="Select element to edit"
                    >
                        <MousePointerClick size={16} />
                    </button>
                    <button
                        onClick={onCodeEditorToggle}
                        className={cn("hover:text-white", isCodeEditorOpen && "text-blue-400")}
                        title="Edit Code"
                    >
                        <Code size={16} />
                    </button>
                    <button onClick={openInNewTab} className="hover:text-white" title="Open in new tab">
                        <ExternalLink size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white dark:bg-black relative aspect-[9/16]">
                {htmlContent ? (
                     <iframe
                        ref={iframeRef}
                        srcDoc={htmlContent}
                        title="Landing Page Preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                    />
                ) : (
                    <div className="w-full h-full bg-background flex items-center justify-center">
                        <Globe className="w-20 h-20 text-muted-foreground/50" />
                    </div>
                )}
            </div>
        </div>
    );
};

const CodeEditor = ({
    code,
    setCode,
    theme,
    onClose
}: {
    code: string,
    setCode: (code: string) => void,
    theme: 'light' | 'dark',
    onClose: () => void
}) => {
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({
            title: 'Copied!',
            description: 'The code has been copied to your clipboard.',
        });
    };

    return (
        <Card className={cn(theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white')}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className={cn(theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800')}>Live Code Editor</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleCopy} className={cn(theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}>
                        <Copy className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className={cn(theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(
                        'w-full h-[400px] border rounded-md resize-y p-4 font-mono text-sm leading-relaxed',
                        theme === 'dark' 
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 focus-visible:ring-primary' 
                            : 'bg-gray-50 text-gray-900 border-gray-300 focus-visible:ring-primary'
                    )}
                    placeholder="HTML code..."
                />
            </CardContent>
        </Card>
    )
};


const MediaSelectionDialog = ({
    isOpen,
    onOpenChange,
    media,
    onSelect,
    offeringId,
    onUploadComplete,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    media: OfferingMedia[];
    onSelect: (mediaUrl: string) => void;
    offeringId: string;
    onUploadComplete: (newMedia: OfferingMedia) => void;
}) => {

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Select a Reference Image</DialogTitle>
                    <DialogDescription>
                        Choose an image from this offering's media gallery or upload a new one.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto space-y-6">
                     <ImageUpload 
                        offeringId={offeringId}
                        onNewMediaUploaded={onUploadComplete}
                        existingMedia={media}
                        onRemoveExistingMedia={() => { /* Not implemented in this dialog */}}
                        offeringContext={{ title: '', description: '' }} // Context not critical here
                    />

                    {media.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media.map((item) => (
                                <div
                                    key={item.id}
                                    className="relative aspect-square rounded-md overflow-hidden cursor-pointer group"
                                    onClick={() => {
                                        onSelect(item.media_url);
                                        onOpenChange(false);
                                    }}
                                >
                                    <Image
                                        src={item.media_url}
                                        alt={item.description || "Offering media"}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Check className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10">
                            No media found for this offering.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ImageChatDialog = ({
    isOpen,
    onOpenChange,
    imageUrl,
    onImageUpdate,
    originalPrompt,
    onRegenerate
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string | null;
    onImageUpdate: (newImageUrl: string) => void;
    originalPrompt: string | null;
    onRegenerate: (newPrompt: string) => void;
}) => {
    const [history, setHistory] = useState<Array<{ role: 'user' | 'bot' | 'system'; content: string | { imageUrl: string } }>>([]);
    const [input, setInput] = useState('');
    const [isEditing, startEditing] = useTransition();
    const { toast } = useToast();
    const [currentImage, setCurrentImage] = useState(imageUrl);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState<'contain' | 'cover'>('contain');

    useEffect(() => {
        setCurrentImage(imageUrl);
        setHistory([]);
    }, [imageUrl]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history, isEditing]);
    
    const handleRestoreImage = (imageUrlToRestore: string) => {
        setCurrentImage(imageUrlToRestore);
        onImageUpdate(imageUrlToRestore);
        setHistory(prev => [...prev, { role: 'system', content: 'Image restored to this version.' }]);
        toast({ title: 'Image Restored', description: 'The main preview has been updated.' });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !currentImage) return;

        const userMessage = { role: 'user' as const, content: input };
        setHistory(prev => [...prev, userMessage]);
        const instruction = input;
        setInput('');

        startEditing(async () => {
            try {
                const { editedImageUrl } = await editImageWithInstruction({
                    imageUrl: currentImage,
                    instruction,
                });
                
                setCurrentImage(editedImageUrl);
                const botMessage = { role: 'bot' as const, content: { imageUrl: editedImageUrl } };
                setHistory(prev => [...prev, botMessage]);
                onImageUpdate(editedImageUrl);

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Editing failed', description: error.message });
                setHistory(prev => prev.filter(msg => msg !== userMessage)); // remove user message on failure
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Chat with Your Image</DialogTitle>
                    <DialogDescription>Give the AI conversational instructions to edit your image.</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="flex flex-col space-y-4 min-h-0">
                        <div className="relative bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-1">
                            {currentImage && (
                                <>
                                    <Image 
                                        src={currentImage} 
                                        alt="Current image to edit" 
                                        fill
                                        style={{objectFit: zoom}}
                                        className="transition-all duration-300"
                                    />
                                     <Button 
                                        variant="secondary" 
                                        size="icon" 
                                        className="absolute top-2 right-2 z-10"
                                        onClick={() => setZoom(prev => prev === 'contain' ? 'cover' : 'contain')}
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                     <div className="flex flex-col h-full bg-background rounded-lg border min-h-0">
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {history.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Bot className="w-12 h-12 text-muted-foreground" />
                                    <p className="mt-4 text-muted-foreground">Ask me anything about your image!</p>
                                </div>
                            )}
                            {history.map((msg, index) => (
                                 <div key={index} className={cn("flex items-start gap-3 w-full", msg.role === 'user' ? 'justify-end' : 'justify-start', msg.role === 'system' && 'justify-center')}>
                                    {msg.role === 'bot' && <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback></Avatar>}
                                    
                                     {msg.role === 'system' ? (
                                        <div className="text-xs text-center text-muted-foreground italic py-2">{msg.content}</div>
                                    ) : (
                                        <div className={`rounded-lg px-3 py-2 max-w-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            {typeof msg.content === 'string' ? (
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Image src={msg.content.imageUrl} width={200} height={200} alt="Edited image" className="rounded-md"/>
                                                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleRestoreImage(msg.content.imageUrl)}>
                                                        <History className="h-4 w-4" />
                                                        Restore to this image
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {msg.role === 'user' && <Avatar className="w-8 h-8"><AvatarFallback><UserIcon className="w-5 h-5"/></AvatarFallback></Avatar>}
                                </div>
                            ))}
                            {isEditing && (
                                <div className="flex items-start gap-3">
                                    <Avatar className="w-8 h-8"><AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback></Avatar>
                                    <div className="rounded-lg px-3 py-2 bg-muted flex items-center">
                                        <Sparkles className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSubmit} className="relative p-4 border-t flex-shrink-0">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g., make the background lighter..."
                                className="pr-16"
                                disabled={isEditing}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-10" disabled={isEditing || !input.trim()}>
                                {isEditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const AddTextDialog = ({
    isOpen,
    onOpenChange,
    onSubmit,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (text: string, position: string) => void;
}) => {
    const [text, setText] = useState('');
    const [position, setPosition] = useState('center');

    const handleSubmit = () => {
        onSubmit(text, position);
        onOpenChange(false);
        setText('');
    };

    const positions = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Text Overlay</DialogTitle>
                    <DialogDescription>
                        Type the text you want to add and choose its position. The AI will render it onto the image.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="text-overlay">Text</Label>
                        <Textarea id="text-overlay" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your text here..."/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="text-position">Position</Label>
                         <Select value={position} onValueChange={setPosition}>
                            <SelectTrigger id="text-position">
                                <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                                {positions.map(pos => (
                                    <SelectItem key={pos} value={pos} className="capitalize">{pos.replace('-', ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!text.trim()}>Add Text</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const RegenerateDialog = ({
    isOpen,
    onOpenChange,
    originalPrompt,
    onRegenerate
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    originalPrompt: string | null;
    onRegenerate: (newPrompt: string) => void;
}) => {
    const [editablePrompt, setEditablePrompt] = useState(originalPrompt || '');

    useEffect(() => {
        setEditablePrompt(originalPrompt || '');
    }, [originalPrompt, isOpen]);
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Regenerate Image</DialogTitle>
                    <DialogDescription>
                        Edit the prompt below to generate a new variation of this image.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Label>Creative Prompt</Label>
                    <Textarea value={editablePrompt} onChange={(e) => setEditablePrompt(e.target.value)} className="h-48 font-mono text-xs bg-muted" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => { onRegenerate(editablePrompt); onOpenChange(false); }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}



// Generate time options for the select dropdown
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') }; // Format to AM/PM
});

export default function ArtisanPage() {
    // Core State
    const [profile, setProfile] = useState<Profile>(null);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [allQueueItems, setAllQueueItems] = useState<QueueItem[]>([]);
    const [mediaPlans, setMediaPlans] = useState<MediaPlanSelectItem[]>([]);
    const [totalCampaignItems, setTotalCampaignItems] = useState(0);
    const [artStyles, setArtStyles] = useState<ArtStyle[]>([]);

    // Workflow State
    const [isDialogOpen, setIsDialogOpen] = useState(true);
    const [workflowMode, setWorkflowMode] = useState<'campaign' | 'custom' | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<MediaPlanSelectItem | null>(null);
    
    // Page Content State
    const [filteredQueueItems, setFilteredQueueItems] = useState<QueueItem[]>([]);
    const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | undefined>();
    const [channelFilter, setChannelFilter] = useState<string>('all');
    const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
    const [selectedArtStyleId, setSelectedArtStyleId] = useState<string>('none');
    const [currentCarouselSlide, setCurrentCarouselSlide] = useState(0);


    // UI & Generation State
    const [editableContent, setEditableContent] = useState<GenerateCreativeOutput['content'] | null>(null);
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [editableHtml, setEditableHtml] = useState<string | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('text');
    const [dimension, setDimension] = useState<keyof typeof dimensionMap>('1:1');
    const [creativePrompt, setCreativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string[]>(['creative-controls']);
    const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');

    const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
    const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
    const [isRemixDialogOpen, setIsRemixDialogOpen] = useState(false);
    const [isRemixing, startRemixing] = useTransition();

    const [isImageChatOpen, setIsImageChatOpen] = useState(false);
    const [imageToChat, setImageToChat] = useState<{url: string, slideIndex?: number} | null>(null);
    const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
    const [isAddTextOpen, setIsAddTextOpen] = useState(false);



    // Filter available channels based on selected campaign
    const availableChannels = useMemo(() => {
        if (workflowMode !== 'campaign' || !selectedCampaign) return [];
        const channels = allQueueItems
            .filter(item => item.media_plan_items?.media_plan_id === selectedCampaign.id)
            .map(item => item.media_plan_items!.user_channel_settings!.channel_name)
            .filter((v, i, a) => a.indexOf(v) === i); // Unique
        return channels;
    }, [workflowMode, selectedCampaign, allQueueItems]);

    // Apply channel filter
    useEffect(() => {
        if (workflowMode === 'campaign' && selectedCampaign) {
            let items = allQueueItems.filter(item => item.media_plan_items?.media_plan_id === selectedCampaign.id);
            if (channelFilter !== 'all') {
                items = items.filter(item => item.media_plan_items?.user_channel_settings?.channel_name === channelFilter);
            }
            setFilteredQueueItems(items);
            // Auto-select first item if selection becomes invalid
            if (items.length > 0 && !items.find(i => i.id === selectedQueueItemId)) {
                handleQueueItemSelect(items[0].id);
            } else if (items.length === 0) {
                handleQueueItemSelect(null);
            }
        }
    }, [channelFilter, selectedCampaign, allQueueItems, workflowMode, selectedQueueItemId]);


    const handleQueueItemSelect = useCallback((queueItemId: string | null) => {
        
        setCreative(null);
        setEditableContent(null);
        setEditableHtml(null);
        setScheduledAt(null);
        setReferenceImageUrl(null);
        setCreativePrompt('');
        setSelectedArtStyleId('none');
        setSelectedQueueItemId(queueItemId);

        if (workflowMode === 'custom') {
            setSelectedOfferingId(undefined);
            return;
        }

        if (!queueItemId) {
            setSelectedOfferingId(undefined);
            return;
        }

        const item = allQueueItems.find(q => q.id === queueItemId);

        if (item && item.media_plan_items) {
            const planItem = item.media_plan_items;
            
            console.log("DEBUG: Selected Queue Item's Plan Item:", JSON.stringify(planItem, null, 2));

            setSelectedOfferingId(item.offering_id);
            
            const promptValue = (planItem.creativePrompt || '');
            console.log("DEBUG: Prompt value from planItem:", promptValue);
            setCreativePrompt(promptValue);

            setEditableContent({ primary: planItem.copy || '', secondary: null });

            const formatValue = (planItem.format || '').toLowerCase();
            const channel = planItem.user_channel_settings?.channel_name || '';
            const formatsForChannel = getFormatsForChannel(channel);

            let newCreativeType: CreativeType = 'image';
            if (formatsForChannel.includes('Text Post')) newCreativeType = 'text';
            if (formatValue.includes('video') || formatValue.includes('reel')) newCreativeType = 'video';
            else if (formatValue.includes('carousel')) newCreativeType = 'carousel';
            else if (formatValue.includes('landing')) newCreativeType = 'landing_page';
            else if (formatValue.includes('text')) newCreativeType = 'text';
            else if (formatsForChannel.some(f => f.toLowerCase().includes('image'))) newCreativeType = 'image';
            setSelectedCreativeType(newCreativeType);

            if (formatValue.includes('1:1') || formatValue.includes('square')) setDimension('1:1');
            else if (formatValue.includes('4:5') || formatValue.includes('portrait')) setDimension('4:5');
            else if (formatValue.includes('9:16') || formatValue.includes('story') || formatValue.includes('reel')) setDimension('9:16');
            else if (formatValue.includes('16:9') || formatValue.includes('landscape')) setDimension('16:9');
            else setDimension('1:1');

            if (planItem.suggested_post_at && isValid(parseISO(planItem.suggested_post_at))) {
                setScheduledAt(parseISO(planItem.suggested_post_at));
            }
        }
    }, [workflowMode, allQueueItems]);

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [profileData, queueData, offeringsData, mediaPlansData, stylesData] = await Promise.all([
                    getProfile(),
                    getQueueItems(),
                    getOfferings(),
                    getMediaPlans(),
                    getArtStyles(),
                ]);

                setProfile(profileData);
                setAllQueueItems(queueData);
                setOfferings(offeringsData);
                setMediaPlans(mediaPlansData);
                setArtStyles(stylesData);
                
                // Don't auto-select here, wait for user action in dialog
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
        
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            setGlobalTheme(storedTheme as 'light' | 'dark');
        }

    }, [toast]);
    
    const startCampaignWorkflow = async (campaign: MediaPlanSelectItem) => {
        setWorkflowMode('campaign');
        setSelectedCampaign(campaign);
        const itemsForCampaign = allQueueItems.filter(item => item.media_plan_items?.media_plan_id === campaign.id);
        setFilteredQueueItems(itemsForCampaign);
        if (itemsForCampaign.length > 0) {
            handleQueueItemSelect(itemsForCampaign[0].id);
        } else {
            handleQueueItemSelect(null);
        }
        
        try {
            const allItems = await getMediaPlanItems(campaign.id);
            setTotalCampaignItems(allItems.length);
        } catch (e) {
            setTotalCampaignItems(itemsForCampaign.length); // fallback
        }

        setChannelFilter('all');
        setIsDialogOpen(false);
    };

    const startCustomWorkflow = () => {
        setWorkflowMode('custom');
        setSelectedCampaign(null);
        setFilteredQueueItems([]);
        setTotalCampaignItems(0);
        handleQueueItemSelect(null);
        setIsDialogOpen(false);
    };


    useEffect(() => {
        if (selectedCreativeType === 'video' && (dimension !== '9:16' && dimension !== '16:9')) {
             setDimension('9:16');
            toast({
                title: 'Aspect Ratio Adjusted',
                description: 'Video generation is only supported in 9:16 and 16:9. Your selection has been updated.',
            });
        }
         if (selectedCreativeType === 'landing_page') {
            setDimension('9:16');
            handleCodeEditorToggle(false);
        }
    }, [selectedCreativeType, dimension, toast]);

    useEffect(() => {
        if (creative?.landingPageHtml) {
            setEditableHtml(creative.landingPageHtml);
        }
    }, [creative?.landingPageHtml]);
    
    const handleCodeEditorToggle = (forceState?: boolean) => {
        const newState = forceState ?? !isCodeEditorOpen;
        setIsCodeEditorOpen(newState);
    };

     useEffect(() => {
        if (isCodeEditorOpen) {
            setActiveAccordion(prev => [...new Set([...prev, 'code-editor'])]);
        } else {
            setActiveAccordion(prev => prev.filter(item => item !== 'code-editor'));
        }
    }, [isCodeEditorOpen]);


    const handleGenerate = async (regeneratePrompt?: string) => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Please select an offering for your custom creative.' });
            return;
        }
        
        // Handle single carousel slide regeneration
        if (selectedCreativeType === 'carousel' && regeneratePrompt) {
            const slideToRegen = creative?.carouselSlides?.[currentCarouselSlide];
            if (slideToRegen) {
                startSaving(async () => {
                    try {
                        const { imageUrl, finalPrompt } = await regenerateCarouselSlide({
                            offeringId: selectedOfferingId,
                            basePrompt: regeneratePrompt,
                            aspectRatio: dimension,
                            artStyleId: selectedArtStyleId !== 'none' ? selectedArtStyleId : undefined,
                        });

                        setCreative(prev => {
                            if (!prev || !prev.carouselSlides) return prev;
                            const newSlides = [...prev.carouselSlides];
                            newSlides[currentCarouselSlide] = { ...newSlides[currentCarouselSlide], imageUrl, finalPrompt };
                            return { ...prev, carouselSlides: newSlides };
                        });
                        
                        toast({ title: 'Slide Regenerated!', description: 'The image for the current slide has been updated.' });

                    } catch(e: any) {
                        toast({ variant: 'destructive', title: 'Regeneration Failed', description: e.message });
                    }
                });
                return; // End execution here for slide regen
            }
        }

        setIsLoading(true);
        setCreative(null);
        setEditableHtml(null);
        // Keep existing text content when regenerating visuals only
        if (selectedCreativeType === 'text') {
            setEditableContent(null);
        }

        try {
            const creativeTypes: CreativeType[] = [selectedCreativeType];
            // Also generate text if a visual type is selected and it's not a regeneration
            if (selectedCreativeType !== 'video' && selectedCreativeType !== 'landing_page' && selectedCreativeType !== 'text' && !regeneratePrompt) {
                creativeTypes.push('text');
            }
            
            const result = await generateCreativeForOffering({
                offeringId: selectedOfferingId,
                creativeTypes: creativeTypes,
                aspectRatio: dimension,
                creativePrompt: regeneratePrompt || creativePrompt,
                referenceImageUrl: referenceImageUrl || undefined,
                artStyleId: selectedArtStyleId !== 'none' ? selectedArtStyleId : undefined,
            });

            setCreative(result);
            if (result.content) {
                setEditableContent(result.content);
            }
             if (result.landingPageHtml) {
                setEditableHtml(result.landingPageHtml);
            }
            // When regenerating, also update the prompt in the text area
            if (regeneratePrompt && result.finalPrompt) {
                setCreativePrompt(result.finalPrompt);
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

    const handleOpenImageChat = (imageUrl: string, slideIndex?: number) => {
        setImageToChat({ url: imageUrl, slideIndex });
        setIsImageChatOpen(true);
    };

     const handleOpenAddText = (imageUrl: string, slideIndex?: number) => {
        setImageToChat({ url: imageUrl, slideIndex });
        setIsAddTextOpen(true);
    };

    const handleAddTextSubmit = (text: string, position: string) => {
        if (!imageToChat?.url) return;

        startSaving(async () => {
            try {
                const instruction = `Add the text "${text}" to the ${position.replace('-', ' ')} of the image.`;
                const { editedImageUrl } = await editImageWithInstruction({
                    imageUrl: imageToChat.url,
                    instruction,
                });
                handleImageUpdate(editedImageUrl);
                toast({ title: 'Text Added!', description: 'The AI has added your text to the image.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to Add Text', description: error.message });
            }
        });
    };

    const handleImageUpdate = (newImageUrl: string) => {
        if (imageToChat?.slideIndex !== undefined) {
            // It's a carousel slide
            const slideIndex = imageToChat.slideIndex;
             setCreative(prev => {
                if (!prev || !prev.carouselSlides) return prev;
                const newSlides = [...prev.carouselSlides];
                newSlides[slideIndex] = { ...newSlides[slideIndex], imageUrl: newImageUrl };
                return { ...prev, carouselSlides: newSlides };
            });
        } else {
            // It's a single image
            setCreative(prev => ({...prev, imageUrl: newImageUrl}));
        }
    };

    const handleSave = (status: 'approved' | 'scheduled', scheduleDate?: Date | null) => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Offering ID is missing.' });
            return;
        }
        
        const isTextOnly = ['text', 'landing_page'].includes(selectedCreativeType);
        const hasVisuals = creative?.imageUrl || (creative?.carouselSlides?.every(s => s.imageUrl)) || creative?.videoUrl;
        const hasContent = !!(editableContent?.primary || editableHtml);

        if (!hasContent || (!isTextOnly && !hasVisuals)) {
             toast({
                variant: 'destructive',
                title: 'Cannot Save',
                description: 'Please generate both text and visuals before saving.',
            });
            return;
        }
        
        startSaving(async () => {
            try {
                const currentQueueItem = allQueueItems.find(item => item.id === selectedQueueItemId) || null;
                
                await saveContent({
                    offeringId: selectedOfferingId,
                    contentBody: editableContent,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoUrl: creative?.videoUrl || null,
                    landingPageHtml: editableHtml,
                    status: status,
                    mediaPlanItemId: currentQueueItem?.media_plan_item_id || null,
                    scheduledAt: scheduleDate?.toISOString(),
                });
                
                if (currentQueueItem) {
                    await updateQueueItemStatus(currentQueueItem.id, 'completed');
                    setAllQueueItems(prev => prev.filter(i => i.id !== currentQueueItem.id));
                }

                toast({
                    title: status === 'scheduled' ? 'Scheduled!' : 'Approved!',
                    description: `The content has been saved and is ready for the calendar.`,
                });
                
                const nextItemIndex = filteredQueueItems.findIndex(i => i.id === selectedQueueItemId);
                if (nextItemIndex !== -1 && nextItemIndex + 1 < filteredQueueItems.length) {
                    handleQueueItemSelect(filteredQueueItems[nextItemIndex + 1].id);
                } else {
                    handleQueueItemSelect(null);
                }

            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Save',
                    description: error.message,
                });
            }
        });
    };
    
    const handleDateTimeChange = (date: Date | undefined, time: string) => {
        if (!date) {
            setScheduledAt(null);
            return;
        }
        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(date);
        if (!isNaN(hours) && !isNaN(minutes)) {
            newDate.setHours(hours, minutes, 0, 0);
        }
        setScheduledAt(newDate);
    };

    const handleRemixPrompt = (comment: string) => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Please select an offering first.' });
            return;
        }
        startRemixing(async () => {
            try {
                const result = await generateCreativePrompt({
                    offeringId: selectedOfferingId,
                    userComment: comment,
                });
                setCreativePrompt(result.newCreativePrompt);
                toast({ title: 'Prompt Remixed!', description: 'A new creative prompt has been generated.' });
                setIsRemixDialogOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Remix Failed', description: error.message });
            }
        });
    };

    const primaryLangName = languageNames.get(profile?.primary_language || 'en') || 'Primary';
    const secondaryLangName = profile?.secondary_language ? languageNames.get(profile.secondary_language) || 'Secondary' : null;

    const isGenerateDisabled = isLoading || isSaving || !selectedOfferingId;
    
    const isTextOnlyCreative = ['text', 'landing_page'].includes(selectedCreativeType);
    const hasVisualContent = creative?.imageUrl || (creative?.carouselSlides && creative.carouselSlides.every(s => s.imageUrl)) || creative?.videoUrl;
    const hasContentToSave = (isTextOnlyCreative && !!(editableContent?.primary || editableHtml)) || (!!editableContent?.primary && hasVisualContent);


    const currentOffering = offerings.find(o => o.id === selectedOfferingId);
    
    const doneCount = totalCampaignItems > 0 ? totalCampaignItems - allQueueItems.filter(item => item.media_plan_items?.media_plan_id === selectedCampaign?.id).length : 0;

    const handleNewUpload = (newMedia: OfferingMedia) => {
        setOfferings(prev => prev.map(o => {
            if (o.id === selectedOfferingId) {
                return {
                    ...o,
                    offering_media: [...(o.offering_media || []), newMedia]
                }
            }
            return o;
        }));
    };

    const currentChannel = (workflowMode === 'campaign' && selectedQueueItemId)
        ? allQueueItems.find(i => i.id === selectedQueueItemId)?.media_plan_items?.user_channel_settings?.channel_name
        : null;

    const availableCreativeOptions = useMemo(() => {
        if (workflowMode === 'campaign' && currentChannel) {
            const formats = getFormatsForChannel(currentChannel);
            const options = new Set<CreativeType>();
            
            formats.forEach(format => {
                const f = format.toLowerCase();
                if (f.includes('text post')) options.add('text');
                if (f.includes('image')) options.add('image');
                if (f.includes('carousel')) options.add('carousel');
                if (f.includes('video') || f.includes('reel')) options.add('video');
                if (f.includes('landing page')) options.add('landing_page');
            });
            // Ensure "Text" is an option if any visual type is available
            if (options.has('image') || options.has('carousel') || options.has('video')) {
                options.add('text');
            }

            return creativeOptions.filter(opt => options.has(opt.id));
        }
        return creativeOptions; // Show all in custom mode
    }, [workflowMode, currentChannel]);
    
    // Derived state for the current image's final prompt
    const finalPromptForCurrentVisual = useMemo(() => {
        if (!creative) return null;
        if (selectedCreativeType === 'carousel' && creative.carouselSlides && creative.carouselSlides.length > currentCarouselSlide) {
            return creative.carouselSlides[currentCarouselSlide]?.finalPrompt;
        }
        return creative.finalPrompt;
    }, [creative, selectedCreativeType, currentCarouselSlide]);

    const handleDownload = (url: string, filename: string) => {
        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = `${filename}.${blob.type.split('/')[1] || 'media'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(objectUrl);
                toast({ title: 'Download Started', description: `Downloading ${filename}` });
            })
            .catch(e => {
                toast({ variant: 'destructive', title: 'Download Failed', description: e.message });
                console.error("Download error:", e);
            });
    };


    return (
        <DashboardLayout>
            <Toaster />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Choose Your Creative Path</DialogTitle>
                        <DialogDescription>Select a campaign to work on, or start a new creative from scratch.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <h3 className="font-semibold text-muted-foreground">Work from a Campaign</h3>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : mediaPlans.length > 0 ? (
                             <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {mediaPlans.map(plan => (
                                    <button key={plan.id} onClick={() => startCampaignWorkflow(plan)} className="w-full text-left p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                                        <p className="font-bold">{plan.title}</p>
                                        <p className="text-sm text-muted-foreground">For: {plan.offering_title}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">No media plans found. Create one from the AI Strategist page.</p>
                        )}
                        <h3 className="font-semibold text-muted-foreground pt-4">Start Fresh</h3>
                        <button onClick={startCustomWorkflow} className="w-full text-left p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
                            <p className="font-bold flex items-center gap-2"><Wand2 className="h-4 w-4"/>Custom AI Creative</p>
                            <p className="text-sm text-muted-foreground">Generate a one-off piece of content for any offering.</p>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

             <ImageChatDialog
                isOpen={isImageChatOpen}
                onOpenChange={setIsImageChatOpen}
                imageUrl={imageToChat?.url || null}
                onImageUpdate={handleImageUpdate}
                originalPrompt={finalPromptForCurrentVisual}
                onRegenerate={(newPrompt) => {
                    setIsImageChatOpen(false);
                    // Update the main prompt and regenerate from the main page
                    setCreativePrompt(newPrompt);
                    handleGenerate(newPrompt);
                }}
            />
            
             <AddTextDialog
                isOpen={isAddTextOpen}
                onOpenChange={setIsAddTextOpen}
                onSubmit={handleAddTextSubmit}
            />

            <RegenerateDialog
                isOpen={isRegenerateOpen}
                onOpenChange={setIsRegenerateOpen}
                originalPrompt={finalPromptForCurrentVisual}
                onRegenerate={(newPrompt) => {
                    // Update the main prompt and regenerate
                    setCreativePrompt(newPrompt);
                    handleGenerate(newPrompt);
                }}
            />


            {selectedOfferingId && (
                <MediaSelectionDialog
                    isOpen={isMediaSelectorOpen}
                    onOpenChange={setIsMediaSelectorOpen}
                    media={currentOffering?.offering_media || []}
                    onSelect={(url) => {
                        setReferenceImageUrl(url);
                        handleGenerate(); // Optionally auto-generate when an image is selected
                    }}
                    offeringId={selectedOfferingId}
                    onUploadComplete={handleNewUpload}
                />
            )}


            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Wand2 className="h-8 w-8 text-primary" />
                            AI Artisan
                        </h1>
                        <p className="text-muted-foreground">
                            {workflowMode === 'campaign' && selectedCampaign ? `Working on: ${selectedCampaign.title}` : 'Custom Creative Mode'}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsDialogOpen(true)}><BookOpen className="mr-2 h-4 w-4" />Change Campaign</Button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <aside className="space-y-8">
                        <Accordion type="multiple" value={activeAccordion} onValueChange={setActiveAccordion} className="w-full space-y-4">
                             <AccordionItem value="creative-controls" className="border-none">
                                <Card>
                                     <AccordionTrigger className="p-6">
                                         <CardHeader className="p-0">
                                            <CardTitle>Creative Controls</CardTitle>
                                         </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="space-y-6">
                                            {workflowMode === 'campaign' && selectedCampaign && (
                                                <div className="space-y-2">
                                                    <Tabs value={channelFilter} onValueChange={setChannelFilter} className="w-full">
                                                        <div className="flex justify-center">
                                                            <TabsList>
                                                                <TabsTrigger value="all">All</TabsTrigger>
                                                                {availableChannels.map(channel => (
                                                                    <TabsTrigger key={channel} value={channel} className="capitalize">{channel}</TabsTrigger>
                                                                ))}
                                                            </TabsList>
                                                        </div>
                                                    </Tabs>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="queue-select" className="flex items-center justify-between">
                                                    <span>Choose an Item to Work On</span>
                                                     {workflowMode === 'campaign' && totalCampaignItems > 0 && (
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            ({doneCount}/{totalCampaignItems})
                                                        </span>
                                                    )}
                                                </Label>
                                                <Select onValueChange={(value) => handleQueueItemSelect(value)} disabled={isLoading} value={selectedQueueItemId || ''}>
                                                    <SelectTrigger id="queue-select">
                                                        <SelectValue placeholder="Select a content idea..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                                        filteredQueueItems.length > 0 ? (
                                                            filteredQueueItems.map(item => (
                                                                <SelectItem key={item.id} value={item.id}>{item.media_plan_items?.concept || 'Untitled Concept'}</SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="none" disabled>No pending items.</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {workflowMode === 'custom' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="offering-select">Choose an Offering</Label>
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
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Label htmlFor="creative-prompt">Refine AI Creative Prompt</Label>
                                                </div>
                                                <Textarea
                                                    id="creative-prompt"
                                                    value={creativePrompt}
                                                    onChange={(e) => setCreativePrompt(e.target.value)}
                                                    placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                                                    className="h-24 resize-none"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="art-style-select">Art Style</Label>
                                                <Select value={selectedArtStyleId} onValueChange={setSelectedArtStyleId}>
                                                    <SelectTrigger id="art-style-select">
                                                        <SelectValue placeholder="Select an art style..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None (Default)</SelectItem>
                                                        {artStyles.map(style => (
                                                            <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {(selectedCreativeType === 'image' || selectedCreativeType === 'video') && (
                                                <div className="space-y-2">
                                                    <Button variant="outline" className="w-full" onClick={() => setIsMediaSelectorOpen(true)} disabled={!selectedOfferingId}>
                                                        <Images className="mr-2" /> Select Reference Image
                                                    </Button>
                                                    {referenceImageUrl && (
                                                        <div className="relative p-2 border rounded-md">
                                                            <p className="text-xs text-muted-foreground mb-2">Using as reference:</p>
                                                            <Image src={referenceImageUrl} alt="Reference image" width={64} height={64} className="rounded" />
                                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setReferenceImageUrl(null)}><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <h3 className="font-medium mb-4">Choose Creative Type</h3>
                                                <RadioGroup
                                                    value={selectedCreativeType}
                                                    onValueChange={(value) => setSelectedCreativeType(value as CreativeType)}
                                                    className="grid grid-cols-2 gap-4"
                                                    disabled={isLoading}
                                                >
                                                    {availableCreativeOptions.map(({ id, label, icon: Icon }) => (
                                                        <div key={id} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={id} id={id} />
                                                            <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer font-normal">
                                                                <Icon /> {label}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                {selectedCreativeType !== 'landing_page' && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="dimension-select">Set Aspect Ratio</Label>
                                                        <Select onValueChange={(v) => setDimension(v as keyof typeof dimensionMap)} disabled={isLoading || selectedCreativeType === 'video'} value={dimension}>
                                                            <SelectTrigger id="dimension-select">
                                                                <SelectValue placeholder="Select aspect ratio..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1:1">Square (1:1)</SelectItem>
                                                                <SelectItem value="4:5">Portrait (4:5)</SelectItem>
                                                                <SelectItem value="9:16">Story (9:16)</SelectItem>
                                                                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label>Schedule Publication</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Popover.Root>
                                                            <Popover.Trigger asChild>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn("w-full justify-start text-left font-normal", !scheduledAt && "text-muted-foreground")}
                                                                    disabled={!hasContentToSave}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {scheduledAt ? format(scheduledAt, "PPP") : <span>Pick a date</span>}
                                                                </Button>
                                                            </Popover.Trigger>
                                                            <Popover.Content className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={scheduledAt || undefined}
                                                                    onSelect={(d) => handleDateTimeChange(d, scheduledAt ? format(scheduledAt, 'HH:mm') : '09:00')}
                                                                    initialFocus
                                                                />
                                                            </Popover.Content>
                                                        </Popover.Root>
                                                        <Select
                                                            value={scheduledAt ? format(scheduledAt, 'HH:mm') : ''}
                                                            onValueChange={(time) => handleDateTimeChange(scheduledAt || new Date(), time)}
                                                            disabled={!hasContentToSave}
                                                        >
                                                            <SelectTrigger className="w-full">
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
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="flex flex-col gap-4">
                                            <Button onClick={() => handleGenerate(creativePrompt)} className="w-full" disabled={isGenerateDisabled}>
                                                <Wand2 className="mr-2 h-4 w-4" />
                                                {isLoading ? 'Generating...' : 'Generate with AI'}
                                            </Button>

                                            <Separator />

                                            <div className="w-full grid grid-cols-2 gap-2">
                                                <Button onClick={() => handleSave('approved')} variant="outline" className="w-full" disabled={isSaving || !hasContentToSave}>
                                                    {isSaving ? 'Saving...' : 'Save Draft'}
                                                </Button>
                                                <Button onClick={() => handleSave('scheduled', scheduledAt)} className="w-full" disabled={isSaving || !hasContentToSave || !scheduledAt}>
                                                    Schedule Post
                                                </Button>
                                            </div>
                                        </CardFooter>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                             {creative && (selectedCreativeType === 'image' || selectedCreativeType === 'carousel' || selectedCreativeType === 'video') && (
                                <AccordionItem value="refinement-controls" className="border-none">
                                    <Card>
                                        <AccordionTrigger className="p-6">
                                            <CardHeader className="p-0">
                                                <CardTitle>Visual Refinement</CardTitle>
                                            </CardHeader>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <CardContent>
                                                <Tabs defaultValue="regenerate" className="w-full">
                                                    <TabsList className="grid w-full grid-cols-2">
                                                        <TabsTrigger value="regenerate">Regenerate</TabsTrigger>
                                                        <TabsTrigger value="retouch" disabled={selectedCreativeType === 'video'}>Retouch</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="regenerate" className="mt-4">
                                                        <div className="space-y-4">
                                                            <Label>Final Prompt Used</Label>
                                                            <Textarea readOnly value={finalPromptForCurrentVisual || 'No prompt available.'} className="h-32 font-mono text-xs bg-muted" />
                                                            <Button onClick={() => setIsRegenerateOpen(true)} className="w-full" disabled={isLoading}>
                                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                                Edit Prompt & Regenerate
                                                            </Button>
                                                        </div>
                                                    </TabsContent>
                                                    <TabsContent value="retouch" className="mt-4">
                                                        <p className="text-sm text-muted-foreground mb-4">Interactively edit your image with chat commands.</p>
                                                        <Button className="w-full" onClick={() => {
                                                            const imageUrl = selectedCreativeType === 'carousel' ? creative.carouselSlides?.[currentCarouselSlide]?.imageUrl : creative.imageUrl;
                                                            if (imageUrl) handleOpenImageChat(imageUrl, selectedCreativeType === 'carousel' ? currentCarouselSlide : undefined)
                                                        }}>
                                                            <Bot className="mr-2 h-4 w-4" /> Start Image Chat
                                                        </Button>
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            )}
                             {isCodeEditorOpen && selectedCreativeType === 'landing_page' && (
                                <AccordionItem value="code-editor" className="border-none">
                                    <CodeEditor
                                        code={editableHtml || ''}
                                        setCode={setEditableHtml}
                                        theme={globalTheme}
                                        onClose={() => handleCodeEditorToggle(false)}
                                    />
                                </AccordionItem>
                            )}
                        </Accordion>
                    </aside>
                     <main className="sticky top-24">
                        <PostPreview
                            profile={profile}
                            dimension={dimension}
                            isLoading={isLoading}
                            selectedCreativeType={selectedCreativeType}
                            creative={{
                                ...creative,
                                landingPageHtml: editableHtml ?? creative?.landingPageHtml
                            }}
                            editableContent={editableContent}
                            secondaryLangName={secondaryLangName}
                            isCodeEditorOpen={isCodeEditorOpen}
                            onCodeEditorToggle={() => handleCodeEditorToggle()}
                            handleContentChange={handleContentChange}
                            handleCarouselSlideChange={handleCarouselSlideChange}
                            onImageEdit={handleOpenImageChat}
                            onRegenerateClick={() => setIsRegenerateOpen(true)}
                            onCurrentSlideChange={setCurrentCarouselSlide}
                            onDownload={handleDownload}
                            onSelectReferenceImage={() => setIsMediaSelectorOpen(true)}
                            onAddText={handleOpenAddText}
                        />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}

    
    





    


    
