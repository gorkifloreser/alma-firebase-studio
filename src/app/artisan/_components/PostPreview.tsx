// This is a new file created by refactoring src/app/artisan/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  X,
  Play,
  Globe,
  ArrowLeft,
  ArrowRight,
  Share,
  ExternalLink,
  MousePointerClick,
  Code,
  Edit,
  Images,
  RefreshCw,
  Download,
  CaseUpper,
} from 'lucide-react';
import Image from 'next/image';
import type { GenerateCreativeOutput } from '@/ai/flows/generate-creative-flow';
import { CodeEditor } from './CodeEditor';

type Profile = {
    full_name: string | null;
    avatar_url: string | null;
    primary_language: string;
    secondary_language: string | null;
} | null;

type CreativeType = 'image' | 'carousel' | 'video' | 'landing_page' | 'text';
const dimensionMap = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-[16/9]',
};

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

export const PostPreview = ({
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
    onEditPost,
    isSaved,
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
    handleCarouselSlideChange: (index: number, field: 'title' | 'body', value: string) => void;
    onImageEdit: (imageUrl: string, slideIndex?: number) => void;
    onRegenerateClick: () => void;
    onCurrentSlideChange: (index: number) => void;
    onDownload: (url: string, filename: string) => void;
    onSelectReferenceImage: () => void;
    onAddText: (imageUrl: string, slideIndex?: number) => void;
    onEditPost: () => void;
    isSaved: boolean;
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
      
        if (selectedCreativeType === 'carousel' && creative?.carouselSlides && creative.carouselSlides.length > 0) {
          return (
            <Carousel setApi={setApi} className="w-full h-full">
              <CarouselContent>
                {creative.carouselSlides.map((slide, index) => (
                  <CarouselItem key={index} className="relative group">
                    {slide.imageUrl ? (
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title || `Slide ${index}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        {/* Placeholder for when image is not available */}
                      </div>
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>
              {creative.carouselSlides.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 z-10" />
                  <CarouselNext className="right-4 top-1/2 -translate-y-1/2 z-10" />
                </>
              )}
            </Carousel>
          );
        }
      
        if (selectedCreativeType === 'image' && creative?.imageUrl) {
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
                onClick={togglePlay}
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="p-4 bg-black/50 rounded-full">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          );
        }
      
        return (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            {/* Placeholder */}
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
                    
                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 z-10">
                        {isSaved && (
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={onEditPost}>
                                <Edit className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                    {/* ... other buttons ... */}
                    
                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col p-3 bg-gradient-to-t from-black/60 via-transparent to-black/60 pointer-events-none">
                        {/* Header */}
                        {/* ... header content ... */}
                        
                        {/* Editable Text Area */}
                        <div className="flex-1 flex items-center justify-center p-4">
                        <Textarea
                                value={currentSlideData ? currentSlideData.body : (editableContent?.primary || '')}
                                onChange={(e) => {
                                    if (currentSlideData) {
                                        handleCarouselSlideChange(current, 'body', e.target.value)
                                    } else {
                                        handleContentChange('primary', e.target.value)
                                    }
                                }}
                                className="w-full text-2xl font-bold text-center border-none focus-visible:ring-0 p-2 h-auto resize-none bg-black/30 rounded-lg shadow-lg [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)] pointer-events-auto"
                                placeholder="Your story text..."
                            />
                        </div>
                        
                        {/* Footer */}
                        {/* ... footer content ... */}
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <div className="relative">
                {isSaved && (
                    <div className="absolute top-2 right-2 z-10">
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={onEditPost}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                )}
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
                        <div className={cn("relative w-full overflow-hidden bg-black flex items-center justify-center", aspectRatioClass)}>
                            {renderVisualContent()}
                            {/* Action buttons */}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start gap-2 pt-2">
                        {/* ... social icons and textareas ... */}
                    </CardFooter>
                </Card>
            </div>
        </TooltipProvider>
    );
}
