

'use client';

import { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getOfferings } from '../offerings/actions';
import { generateContentForOffering, saveContent, generateCreativeForOffering, getQueueItems, updateQueueItemStatus } from './actions';
import { getMediaPlans } from '../funnels/actions';
import type { Offering } from '../offerings/actions';
import type { QueueItem } from './actions';
import type { GenerateContentOutput } from '@/ai/flows/generate-content-flow';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Image as ImageIcon, Video, Layers, Type, Heart, MessageCircle, Send, Bookmark, CornerDownLeft, MoreHorizontal, X, Play, Pause, Globe, Wifi, Battery, ArrowLeft, ArrowRight, Share, ExternalLink, MousePointerClick, Code, Copy, BookOpen, Edit } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';


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

type CreativeType = 'image' | 'carousel' | 'video' | 'landing_page';

const creativeOptions: { id: CreativeType, label: string, icon: React.ElementType }[] = [
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


const EditPromptDialog = ({
  isOpen,
  onOpenChange,
  prompt,
  onSave,
  isRegenerating,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  onSave: (newPrompt: string) => void;
  isRegenerating: boolean;
}) => {
  const [editedPrompt, setEditedPrompt] = useState(prompt);

  useEffect(() => {
    if (isOpen) {
      setEditedPrompt(prompt);
    }
  }, [isOpen, prompt]);

  const handleSave = () => {
    onSave(editedPrompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Creative Prompt</DialogTitle>
          <DialogDescription>
            Modify the prompt for this specific slide and regenerate the image.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            className="h-48 font-mono text-sm"
            placeholder="Enter the new creative prompt..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isRegenerating}>
            {isRegenerating ? 'Regenerating...' : 'Save & Regenerate Image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
    onRegenerateSlide,
}: {
    profile: Profile,
    dimension: keyof typeof dimensionMap,
    isLoading: boolean,
    selectedCreativeType: CreativeType,
    creative: GenerateCreativeOutput | null,
    editableContent: GenerateContentOutput['content'] | null,
    secondaryLangName: string | null,
    isCodeEditorOpen: boolean,
    onCodeEditorToggle: () => void,
    handleContentChange: (language: 'primary' | 'secondary', value: string) => void,
    handleCarouselSlideChange: (index: number, newText: string) => void,
    onRegenerateSlide: (slideIndex: number, newPrompt: string) => void;
}) => {
    const postUser = profile?.full_name || 'Your Brand';
    const postUserHandle = postUser.toLowerCase().replace(/\s/g, '');
    const aspectRatioClass = dimensionMap[dimension];
    const isStory = dimension === '9:16';
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
    const [isRegeneratingSlide, startRegeneratingSlide] = useTransition();

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
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);
    
    const progressCount = creative?.carouselSlides?.length || 1;
    const currentSlideData = (selectedCreativeType === 'carousel' && creative?.carouselSlides) ? creative.carouselSlides[current] : null;

    const handlePromptSave = (newPrompt: string) => {
        startRegeneratingSlide(async () => {
            await onRegenerateSlide(current, newPrompt);
            setIsPromptEditorOpen(false);
        });
    };


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
                                <Button 
                                    variant="secondary" 
                                    size="sm"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setIsPromptEditorOpen(true)}
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Edit Prompt
                                </Button>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {isStory && creative.carouselSlides.length > 1 && (
                        <>
                            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white border-none hover:bg-black/70 hover:text-white" />
                            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white border-none hover:bg-black/70 hover:text-white" />
                        </>
                    )}
                </Carousel>
            );
        }
        if (creative?.imageUrl) {
            return <Image src={creative.imageUrl} alt="Generated creative" fill className="object-cover" />;
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
            <>
            <div className={cn("relative w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg text-white", aspectRatioClass)}>
                 <div className="absolute inset-0 bg-black">
                    {renderVisualContent()}
                </div>
                
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
            {currentSlideData && (
                <EditPromptDialog
                    isOpen={isPromptEditorOpen}
                    onOpenChange={setIsPromptEditorOpen}
                    prompt={currentSlideData.creativePrompt}
                    onSave={handlePromptSave}
                    isRegenerating={isRegeneratingSlide}
                />
             )}
            </>
        );
    }

    return (
        <>
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
                <div className={cn("relative w-full overflow-hidden", aspectRatioClass)}>
                    {selectedCreativeType === 'carousel' && creative?.carouselSlides ? (
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
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => setIsPromptEditorOpen(true)}
                                        >
                                          <Edit className="mr-2 h-4 w-4" /> Edit Prompt
                                        </Button>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {creative.carouselSlides.length > 1 && (
                                <>
                                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                                </>
                            )}
                        </Carousel>
                    ) : (
                        renderVisualContent()
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
        {currentSlideData && (
          <EditPromptDialog
            isOpen={isPromptEditorOpen}
            onOpenChange={setIsPromptEditorOpen}
            prompt={currentSlideData.creativePrompt}
            onSave={handlePromptSave}
            isRegenerating={isRegeneratingSlide}
          />
        )}
        </>
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


const MultiSelect = ({
  options,
  selected,
  onChange,
  className,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {selected.length > 0 ? selected.join(', ') : 'Filter by channel...'}
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Content className="w-[--radix-popover-trigger-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search channels..." />
          <CommandList>
            <CommandEmpty>No channels found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="capitalize"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Popover.Content>
    </Popover.Root>
  );
};


export default function ArtisanPage() {
    // Core State
    const [profile, setProfile] = useState<Profile>(null);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [allQueueItems, setAllQueueItems] = useState<QueueItem[]>([]);
    const [mediaPlans, setMediaPlans] = useState<MediaPlanSelectItem[]>([]);

    // Workflow State
    const [isDialogOpen, setIsDialogOpen] = useState(true);
    const [workflowMode, setWorkflowMode] = useState<'campaign' | 'custom' | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<MediaPlanSelectItem | null>(null);
    
    // Page Content State
    const [filteredQueueItems, setFilteredQueueItems] = useState<QueueItem[]>([]);
    const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | undefined>();
    const [channelFilter, setChannelFilter] = useState<string[]>([]);

    // UI & Generation State
    const [editableContent, setEditableContent] = useState<GenerateContentOutput['content'] | null>(null);
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [editableHtml, setEditableHtml] = useState<string | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('image');
    const [dimension, setDimension] = useState<keyof typeof dimensionMap>('1:1');
    const [creativePrompt, setCreativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string[]>(['creative-controls']);
    const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');

    // Filter available channels based on selected campaign
    const availableChannels = useMemo(() => {
        if (workflowMode !== 'campaign' || !selectedCampaign) return [];
        const channels = allQueueItems
            .filter(item => item.media_plan_items?.media_plan_id === selectedCampaign.id)
            .map(item => item.media_plan_items.channel)
            .filter((v, i, a) => a.indexOf(v) === i); // Unique
        return channels;
    }, [workflowMode, selectedCampaign, allQueueItems]);

    // Apply channel filter
    useEffect(() => {
        if (workflowMode === 'campaign' && selectedCampaign) {
            let items = allQueueItems.filter(item => item.media_plan_items?.media_plan_id === selectedCampaign.id);
            if (channelFilter.length > 0) {
                items = items.filter(item => channelFilter.includes(item.media_plan_items.channel));
            }
            setFilteredQueueItems(items);
            // Auto-select first item if selection becomes invalid
            if (items.length > 0 && !items.find(i => i.id === selectedQueueItemId)) {
                handleQueueItemSelect(items[0].id, items);
            } else if (items.length === 0) {
                handleQueueItemSelect(null, []);
            }
        }
    }, [channelFilter, selectedCampaign, allQueueItems, workflowMode, selectedQueueItemId]);


    const handleQueueItemSelect = useCallback((queueItemId: string | null, items: QueueItem[]) => {
        setSelectedQueueItemId(queueItemId);
        setIsCodeEditorOpen(false);
        setCreative(null);
        setEditableHtml(null);

        if (!queueItemId || workflowMode === 'custom') {
            setCreativePrompt('');
            setEditableContent(null);
            if (workflowMode === 'custom') setSelectedOfferingId(undefined);
            return;
        }

        const item = items.find(q => q.id === queueItemId);
        if (item) {
            setSelectedOfferingId(item.offering_id);
            if (item.media_plan_items) {
                const planItem = item.media_plan_items as any;
                const promptFromDb = planItem.creative_prompt || '';
                setCreativePrompt(promptFromDb);
                setEditableContent({ primary: planItem.copy || '', secondary: null });
                
                const format = (planItem.format || '').toLowerCase();
                
                // Auto-update dimension based on format
                if (format.includes('video')) setSelectedCreativeType('video');
                else if (format.includes('carousel')) setSelectedCreativeType('carousel');
                else if (format.includes('landing')) setSelectedCreativeType('landing_page');
                else setSelectedCreativeType('image');

                if (format.includes('1:1') || format.includes('square')) setDimension('1:1');
                else if (format.includes('4:5') || format.includes('portrait')) setDimension('4:5');
                else if (format.includes('9:16') || format.includes('story') || format.includes('reel')) setDimension('9:16');
                else if (format.includes('16:9') || format.includes('landscape')) setDimension('16:9');
                else setDimension('1:1'); // Default
            }
        } else {
            setCreativePrompt('');
            setEditableContent(null);
            setSelectedOfferingId(undefined);
        }
    }, [workflowMode]);

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [profileData, queueData, offeringsData, mediaPlansData] = await Promise.all([
                    getProfile(),
                    getQueueItems(),
                    getOfferings(),
                    getMediaPlans(),
                ]);

                setProfile(profileData);
                setAllQueueItems(queueData);
                setOfferings(offeringsData);
                setMediaPlans(mediaPlansData);
                
                // Don't auto-select here, wait for user action in dialog
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error fetching data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
        
        const currentTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
        setGlobalTheme(currentTheme);
    }, [toast]);
    
    const startCampaignWorkflow = (campaign: MediaPlanSelectItem) => {
        setWorkflowMode('campaign');
        setSelectedCampaign(campaign);
        const itemsForCampaign = allQueueItems.filter(item => item.media_plan_items?.media_plan_id === campaign.id);
        setFilteredQueueItems(itemsForCampaign);
        if (itemsForCampaign.length > 0) {
            handleQueueItemSelect(itemsForCampaign[0].id, itemsForCampaign);
        } else {
            handleQueueItemSelect(null, []);
        }
        setChannelFilter([]);
        setIsDialogOpen(false);
    };

    const startCustomWorkflow = () => {
        setWorkflowMode('custom');
        setSelectedCampaign(null);
        setFilteredQueueItems([]);
        handleQueueItemSelect(null, []);
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


    const handleGenerate = async () => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Please select an offering for your custom creative.' });
            return;
        }

        setIsLoading(true);
        setCreative(null);
        setEditableHtml(null);

        try {
            const creativeTypes: CreativeType[] = [selectedCreativeType];
            const visualBasedSelected = creativeTypes.some(t => ['image', 'video', 'carousel', 'landing_page'].includes(t));

            if (visualBasedSelected) {
                const creativeResult = await generateCreativeForOffering({
                    offeringId: selectedOfferingId,
                    creativeTypes: creativeTypes.filter(t => t !== 'text') as any,
                    aspectRatio: dimension,
                    creativePrompt: creativePrompt,
                });
                setCreative(creativeResult);
                 if (creativeResult.landingPageHtml) {
                    setEditableHtml(creativeResult.landingPageHtml);
                }
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
    
    const handleRegenerateSlide = async (slideIndex: number, newPrompt: string) => {
        if (!creative || !creative.carouselSlides || !selectedOfferingId) return;

        try {
            // Update the specific slide's prompt
            const updatedSlides = creative.carouselSlides.map((slide, index) =>
                index === slideIndex ? { ...slide, creativePrompt: newPrompt } : slide
            );
            setCreative(prev => prev ? { ...prev, carouselSlides: updatedSlides } : null);

            // Regenerate only that image
            const result = await generateCreativeForOffering({
                offeringId: selectedOfferingId,
                creativeTypes: ['image'], // We only want one image
                aspectRatio: dimension,
                creativePrompt: newPrompt, // Use the new prompt
            });

            if (result.imageUrl) {
                // Update the image URL for the correct slide
                setCreative(prev => {
                    if (!prev || !prev.carouselSlides) return prev;
                    const newSlides = [...prev.carouselSlides];
                    newSlides[slideIndex] = { ...newSlides[slideIndex], imageUrl: result.imageUrl };
                    return { ...prev, carouselSlides: newSlides };
                });
                toast({ title: 'Slide Image Regenerated!' });
            } else {
                throw new Error("AI did not return an image.");
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Slide Regeneration Failed', description: error.message });
        }
    };


    const handleApprove = () => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Offering ID is missing.' });
            return;
        }
        if (!editableContent && !creative && !editableHtml) {
            toast({ variant: 'destructive', title: 'Error', description: 'No content to save.' });
            return;
        }
        const currentQueueItem = allQueueItems.find(item => item.id === selectedQueueItemId) || null;

        startSaving(async () => {
            try {
                await saveContent({
                    offeringId: selectedOfferingId,
                    contentBody: editableContent,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoUrl: creative?.videoUrl || null,
                    landingPageHtml: editableHtml,
                    status: 'approved',
                    mediaPlanItemId: currentQueueItem?.media_plan_items?.id,
                });
                if (currentQueueItem) {
                    await updateQueueItemStatus(currentQueueItem.id, 'completed');
                    setAllQueueItems(prev => prev.filter(i => i.id !== currentQueueItem.id));
                }
                toast({
                    title: 'Approved!',
                    description: 'The content has been saved and is ready for the calendar.',
                });
                
                const nextItem = filteredQueueItems.find(i => i.id !== selectedQueueItemId) || null;
                handleQueueItemSelect(nextItem?.id || null, filteredQueueItems);

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

    const isGenerateDisabled = isLoading || isSaving || !selectedOfferingId;

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
                        {mediaPlans.length > 0 ? (
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
                                                    <Label>1. Filter by Channel</Label>
                                                    <MultiSelect
                                                        options={availableChannels}
                                                        selected={channelFilter}
                                                        onChange={setChannelFilter}
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="queue-select">{workflowMode === 'campaign' ? '2.' : '1.'} Choose an Item or Go Custom</Label>
                                                <Select onValueChange={(value) => handleQueueItemSelect(value, filteredQueueItems)} disabled={isLoading} value={selectedQueueItemId || ''}>
                                                    <SelectTrigger id="queue-select">
                                                        <SelectValue placeholder="Select a content idea..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                                        filteredQueueItems.length > 0 ? (
                                                            filteredQueueItems.map(item => (
                                                                <SelectItem key={item.id} value={item.id}>{(item.media_plan_items as any)?.concept || 'Untitled Concept'}</SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="none" disabled>No pending items.</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {workflowMode === 'custom' && (
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
                                                <Label htmlFor="creative-prompt">{workflowMode === 'campaign' ? '3.' : '3.'} AI Creative Prompt</Label>
                                                <Textarea
                                                    id="creative-prompt"
                                                    value={creativePrompt}
                                                    onChange={(e) => setCreativePrompt(e.target.value)}
                                                    placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                                                    className="h-24 mt-1 resize-none"
                                                />
                                            </div>

                                            <div>
                                                <h3 className="font-medium mb-4">{workflowMode === 'campaign' ? '4.' : '4.'} Creative Type</h3>
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

                                            {selectedCreativeType !== 'landing_page' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="dimension-select">{workflowMode === 'campaign' ? '5.' : '5.'} Aspect Ratio</Label>
                                                    <Select onValueChange={(v) => setDimension(v as keyof typeof dimensionMap)} disabled={isLoading} value={dimension}>
                                                        <SelectTrigger id="dimension-select">
                                                            <SelectValue placeholder="Select aspect ratio..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1:1" disabled={selectedCreativeType === 'video'}>Square (1:1)</SelectItem>
                                                            <SelectItem value="4:5" disabled={selectedCreativeType === 'video'}>Portrait (4:5)</SelectItem>
                                                            <SelectItem value="9:16">Story (9:16)</SelectItem>
                                                            <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="flex-col gap-4">
                                            <Button onClick={handleGenerate} className="w-full" disabled={isGenerateDisabled}>
                                                {isLoading ? 'Generating...' : 'Generate with AI'}
                                            </Button>
                                            <Button onClick={handleApprove} variant="outline" className="w-full" disabled={isLoading || isSaving || (!editableContent && !creative)}>
                                                {isSaving ? 'Approving...' : 'Approve & Save'}
                                            </Button>
                                        </CardFooter>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
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
                            onRegenerateSlide={handleRegenerateSlide}
                        />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
