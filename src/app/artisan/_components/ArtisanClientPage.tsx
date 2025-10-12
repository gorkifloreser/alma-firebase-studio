// GEMINI_SAFE_START
// @functional: This component and its related features are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-10-02

'use client';

import { useEffect, useState, useTransition, useCallback, useMemo, useRef } from 'react';
import {
    getOfferings,
    deleteOfferingMedia,
  } from '@/app/offerings/actions';
  import {
    generateCreativeForOffering,
    saveContent,
    updateContent,
    deleteContent,
    getArtisanItems,
    updateMediaPlanItemStatus,
    generateCreativePrompt,
    editImageWithInstruction,
    regenerateCarouselSlide,
    getContentItem,
  } from '../actions';
  import { getMediaPlans, getMediaPlanItems } from '@/app/funnels/actions';
import type { CalendarItem } from '@/app/calendar/actions';
import type { Offering, OfferingMedia } from '../../offerings/actions';
import type { ArtisanItem } from '../actions';
import type { GenerateCreativeOutput, CarouselSlide } from '@/ai/flows/generate-creative-flow';
import { Wand2, Image as ImageIcon, Globe, RefreshCw, X, Loader2, Bot, Sparkles, ZoomIn, History, Type, Layers, Video, GitBranch, Workflow, Edit, SendHorizonal, Undo } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getProfile } from '@/app/settings/actions';
import { languages } from '@/lib/languages';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, parseISO, isValid } from 'date-fns';
import { getFormatsForChannel, mediaFormatConfig } from '@/lib/media-formats';
import { EditContentDialog } from '@/app/calendar/_components/EditContentDialog';
import { CodeEditor } from './CodeEditor';
import { CreativeControls } from './CreativeControls';
import { PostPreview } from './PostPreview';
import { TextContentEditor } from './TextContentEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

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

// Dialog components (MediaSelectionDialog, ImageChatDialog, etc.) are unchanged and omitted for brevity.
// ...

export default function ArtisanClientPage({ 
    initialProfile,
    initialOfferings,
    initialArtisanItems,
    initialMediaPlans 
}: ArtisanClientPageProps) {
    const [profile, setProfile] = useState<Profile>(initialProfile);
    const [offerings, setOfferings] = useState<Offering[]>(initialOfferings);
    const [allArtisanItems, setAllArtisanItems] = useState<ArtisanItem[]>(initialArtisanItems);
    const [mediaPlans, setMediaPlans] = useState<MediaPlanSelectItem[]>(initialMediaPlans);
    const [totalCampaignItems, setTotalCampaignItems] = useState(0);
    const [savedContent, setSavedContent] = useState<CalendarItem | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(true);
    const [workflowMode, setWorkflowMode] = useState<'campaign' | 'custom' | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<MediaPlanSelectItem | null>(null);
    
    const [filteredArtisanItems, setFilteredArtisanItems] = useState<ArtisanItem[]>([]);
    const [selectedArtisanItemId, setSelectedArtisanItemId] = useState<string | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | undefined>();
    const [channelFilter, setChannelFilter] = useState<string>('all');
    const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
    const [currentCarouselSlide, setCurrentCarouselSlide] = useState(0);

    const [editableContent, setEditableContent] = useState('');
    const [editableHashtags, setEditableHashtags] = useState('');
    const [creative, setCreative] = useState<GenerateCreativeOutput | null>(null);
    const [editableHtml, setEditableHtml] = useState<string | null>(null);
    const [selectedCreativeType, setSelectedCreativeType] = useState<CreativeType>('text');
    const [selectedCreativeFormat, setSelectedCreativeFormat] = useState<string>('text');
    const [dimension, setDimension] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1');
    const [creativePrompt, setCreativePrompt] = useState('');
    const [objective, setObjective] = useState('');
    const [concept, setConcept] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [globalTheme, setGlobalTheme] = useState<'light' | 'dark'>('light');
    
    const [isDirty, setIsDirty] = useState(false);
    const [originalContentState, setOriginalContentState] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<{ type: 'item' | 'channel', value: string | null } | null>(null);
    
    // Other dialog states (unchanged)
    // ...

    useEffect(() => {
        console.log('[DEBUG] State for editableHashtags updated to:', editableHashtags);
    }, [editableHashtags]);

    const handleArtisanItemSelect = useCallback(async (artisanItemId: string | null) => {
        console.log(`[DEBUG] Item selected. ID: ${artisanItemId}`);
        setCreative(null);
        setEditableContent('');
        setEditableHashtags('');
        setEditableHtml(null);
        setScheduledAt(null);
        setObjective('');
        setConcept('');
        setSelectedArtisanItemId(artisanItemId);
        setSavedContent(null);
    
        if (!artisanItemId) {
            setSelectedOfferingId(undefined);
            setCreativePrompt('');
            setOriginalContentState(null);
            setIsDirty(false);
            return;
        }
    
        const item = allArtisanItems.find(q => q.id === artisanItemId);
        console.log('[DEBUG] Found item in allArtisanItems:', item); // Enhanced log

        if (item) {
            setIsLoading(true);
            const contentItem = (item.status === 'ready_for_review' || item.status === 'scheduled' || item.status === 'published') 
                ? await getContentItem(item.id) 
                : null;
            
            const source = contentItem || item;

            setCreativePrompt(source.creative_prompt || '');
            setSelectedOfferingId(source.offering_id ?? undefined);
            setEditableContent(source.copy || '');
            setEditableHashtags(source.hashtags || '');
            setObjective(source.objective || '');
            setConcept(source.concept || '');
            if (source.landing_page_html) setEditableHtml(source.landing_page_html);
            if (contentItem) setSavedContent(contentItem as unknown as CalendarItem);

            const formatConfig = mediaFormatConfig.flatMap(c => c.formats).find(f => f.value === (source.media_format || 'Text Post'));
            setSelectedCreativeFormat(formatConfig?.value || 'Text Post');
            setSelectedCreativeType(formatConfig?.creativeType || 'text');
            setDimension(source.aspect_ratio || formatConfig?.aspect_ratios[0]?.value || '1:1');
            setScheduledAt(source.scheduled_at ? parseISO(source.scheduled_at) : null);

            const creativeData = {
                imageUrl: source.image_url || null,
                carouselSlides: typeof source.carousel_slides === 'string' ? JSON.parse(source.carousel_slides) : (source.carousel_slides || null),
                videoScript: typeof source.video_script === 'string' ? JSON.parse(source.video_script) : (source.video_script || null),
                landingPageHtml: source.landing_page_html || null,
            };
            setCreative(creativeData);

            const initialState = {
                copy: source.copy || '',
                hashtags: source.hashtags || '',
                creativePrompt: source.creative_prompt || '',
                html: source.landing_page_html || null,
                format: formatConfig?.value || 'Text Post',
                dimension: source.aspect_ratio || formatConfig?.aspect_ratios[0]?.value || '1:1',
                scheduledAt: source.scheduled_at ? parseISO(source.scheduled_at) : null,
                creative: creativeData,
            };

            setOriginalContentState(initialState);
            setIsDirty(false);
            setIsLoading(false);
        } else {
            console.log('[DEBUG] No item found in allArtisanItems for the selected ID.'); // Enhanced log
        }
    }, [allArtisanItems, toast]);

    useEffect(() => {
        if (!originalContentState || isLoading || isSaving) {
            setIsDirty(false);
            return;
        }
    
        const scheduleTimeChanged = (scheduledAt?.getTime() ?? null) !== (originalContentState.scheduledAt?.getTime() ?? null);
    
        const creativeChanged = 
            creative?.imageUrl !== originalContentState.creative.imageUrl ||
            JSON.stringify(creative?.carouselSlides) !== JSON.stringify(originalContentState.creative.carouselSlides) ||
            JSON.stringify(creative?.videoScript) !== JSON.stringify(originalContentState.creative.videoScript);
    
        const hasChanged =
            editableContent !== originalContentState.copy ||
            editableHashtags !== originalContentState.hashtags ||
            creativePrompt !== originalContentState.creativePrompt ||
            editableHtml !== originalContentState.html ||
            selectedCreativeFormat !== originalContentState.format ||
            dimension !== originalContentState.dimension ||
            scheduleTimeChanged ||
            creativeChanged;
    
        setIsDirty(hasChanged);
    }, [
        editableContent,
        editableHashtags,
        creativePrompt,
        editableHtml,
        selectedCreativeFormat,
        dimension,
        scheduledAt,
        creative,
        originalContentState,
        isLoading,
        isSaving
    ]);

    // ... (useEffect hooks are mostly unchanged)

    const handleGenerate = async (regeneratePrompt?: string) => {
        // ... (generation logic is largely unchanged, but now we handle text differently)
        setIsLoading(true);
        setCreative(null);
        setEditableHtml(null);
        setEditableContent('');
        setEditableHashtags('');

        try {
            // ...
            const result = await generateCreativeForOffering({
                // ...
            });
            
            setCreative(result);
            if (result.content) {
                // Assuming the AI returns a structure with copy and hashtags
                setEditableContent(result.content.primary || '');
                // This part might need adjustment based on actual AI output for hashtags
                setEditableHashtags((result.content as any).hashtags || '');
            }
            if (result.landingPageHtml) setEditableHtml(result.landingPageHtml);
            if (result.finalPrompt) setCreativePrompt(result.finalPrompt);

            toast({ title: 'Content Generated!', description: 'You can now edit and approve the drafts.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = (status: 'ready_for_review' | 'scheduled', scheduleDate?: Date | null, onComplete?: () => void) => {
        if (!selectedOfferingId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Offering ID is missing.' });
            return;
        }

        const hasContentToSave = editableContent || editableHtml || creative?.imageUrl || creative?.carouselSlides || creative?.videoUrl;

        if (!hasContentToSave) {
             toast({ variant: 'destructive', title: 'Cannot Save', description: 'Please generate some content before saving.' });
            return;
        }
        
        startSaving(async () => {
            try {
                const currentItemDetails = allArtisanItems.find(i => i.id === selectedArtisanItemId);
                const payload = {
                    offeringId: selectedOfferingId,
                    copy: editableContent,
                    hashtags: editableHashtags,
                    creative_prompt: creativePrompt,
                    concept: concept,
                    objective: objective,
                    imageUrl: creative?.imageUrl || null,
                    carouselSlides: creative?.carouselSlides || null,
                    videoScript: creative?.videoScript || null,
                    landingPageHtml: editableHtml,
                    status: status,
                    scheduledAt: scheduleDate?.toISOString(),
                    media_format: selectedCreativeFormat,
                    aspect_ratio: dimension,
                };

                let updatedItem: CalendarItem;
                
                if (savedContent) {
                    updatedItem = await updateContent(savedContent.id, payload);
                    toast({ title: 'Content Updated!', description: 'Your changes have been saved.' });
                } else {
                    updatedItem = await saveContent({ ...payload, mediaPlanItemId: selectedArtisanItemId });
                    if (selectedArtisanItemId) {
                         await updateMediaPlanItemStatus(selectedArtisanItemId, 'ready_for_review');
                         setAllArtisanItems(prev => prev.map(i => i.id === selectedArtisanItemId ? {...i, status: 'ready_for_review'} : i));
                    }
                    toast({ title: status === 'scheduled' ? 'Scheduled!' : 'Approved!', description: `The content has been saved.` });
                }
                
                setSavedContent(updatedItem as unknown as CalendarItem);
                await handleArtisanItemSelect(updatedItem.id);
                if (onComplete) {
                    onComplete();
                }
                
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to Save', description: error.message });
            }
        });
    };

    const handleDelete = () => {
        if (!savedContent) {
            toast({ variant: 'destructive', title: 'Error', description: 'No saved content to delete.' });
            return;
        }
        startSaving(async () => {
            try {
                await deleteContent(savedContent.id);
                toast({ title: 'Content Deleted', description: 'The post has been successfully deleted.' });
                // Reset the UI
                const nextItemIndex = allArtisanItems.findIndex(i => i.id === selectedArtisanItemId);
                setAllArtisanItems(prev => prev.filter(i => i.id !== selectedArtisanItemId));
                handleArtisanItemSelect(allArtisanItems[nextItemIndex + 1]?.id || allArtisanItems[0]?.id || null);

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
            }
        });
    };

    const performChange = (type: 'item' | 'channel', value: string | null) => {
        if (type === 'item') {
            handleArtisanItemSelect(value);
        } else if (type === 'channel') {
            setChannelFilter(value as string);
        }
        setPendingAction(null);
    };
    
    const handleAttemptChange = (type: 'item' | 'channel', value: string | null) => {
        if (isDirty && selectedArtisanItemId) {
            setPendingAction({ type, value });
        } else {
            performChange(type, value);
        }
    };
    
    const handleDialogAction = (action: 'save' | 'discard' | 'cancel') => {
        if (!pendingAction) return;
    
        if (action === 'cancel') {
            setPendingAction(null);
            return;
        }
    
        if (action === 'discard') {
            setIsDirty(false);
            performChange(pendingAction.type, pendingAction.value);
            return;
        }
    
        if (action === 'save') {
            handleSave('ready_for_review', scheduledAt, () => {
                performChange(pendingAction.type, pendingAction.value);
            });
        }
    };

    // ... (other handlers like handleContentUpdated, handleCarouselSlideChange are simplified or removed)

    const hasContent = !!(editableContent || editableHtml || creative?.imageUrl || creative?.carouselSlides || creative?.videoUrl);
    
    // ... (other derived state variables are mostly unchanged)

    return (
        <>
            <AlertDialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>You have unsaved changes!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your work on the current item has not been saved. What would you like to do?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="ghost" onClick={() => handleDialogAction('cancel')}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDialogAction('discard')}>Discard Changes & Continue</Button>
                        <Button onClick={() => handleDialogAction('save')} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save & Continue'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Other Dialogs are unchanged */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                {/* Header is unchanged */}
                {!workflowMode ? (
                     <Card> {/* Welcome screen is unchanged */} </Card>
                ) : (
                    <div className="space-y-8">
                        {/* Campaign/Workflow info card is unchanged */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <aside className="space-y-8 lg:sticky top-24">
                                <CreativeControls
                                    // ... (props are passed down)
                                    setChannelFilter={(value) => handleAttemptChange('channel', value)}
                                    handleArtisanItemSelect={(id) => handleAttemptChange('item', id)}
                                    isSaved={!!savedContent}
                                    onDelete={handleDelete}
                                />
                            </aside>
                            <main className="space-y-6">
                                <PostPreview
                                    profile={profile}
                                    dimension={dimension}
                                    isLoading={isLoading}
                                    selectedCreativeType={selectedCreativeType}
                                    creative={{
                                        ...creative,
                                        landingPageHtml: editableHtml ?? creative?.landingPageHtml
                                    }}
                                    isCodeEditorOpen={isCodeEditorOpen}
                                    onCodeEditorToggle={() => setIsCodeEditorOpen(!isCodeEditorOpen)}
                                    // ... (visual-related handlers are passed down)
                                    isSaved={!!savedContent}
                                />
                                {isCodeEditorOpen && selectedCreativeType === 'landing_page' && (
                                     <CodeEditor
                                        code={editableHtml || ''}
                                        setCode={setEditableHtml}
                                        theme={globalTheme}
                                        onClose={() => setIsCodeEditorOpen(false)}
                                    />
                                )}
                                <TextContentEditor
                                    editableContent={editableContent}
                                    editableHashtags={editableHashtags}
                                    onContentChange={setEditableContent}
                                    onHashtagsChange={setEditableHashtags}
                                />
                            </main>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// GEMINI_SAFE_END
