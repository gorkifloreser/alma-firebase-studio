
'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
} from '@/components/ui/alert-dialog';
import {
    Bot,
    Calendar as CalendarIcon,
    CheckCircle2,
    CircleDashed,
    Images,
    Wand2,
    RefreshCw,
    X,
    GitBranch,
    Trash2,
    Save,
} from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import type { Offering } from '@/app/offerings/actions';
import type { ArtisanItem } from '@/app/artisan/actions';
import { mediaFormatConfig, MediaFormat } from '@/lib/media-formats';

const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { value: time, label: format(new Date(2000, 0, 1, hours, minutes), 'p') };
});

type CreativeType = 'image' | 'carousel' | 'video' | 'landing_page' | 'text';

type CreativeControlsProps = {
    workflowMode: 'campaign' | 'custom' | null;
    allArtisanItems: ArtisanItem[];
    channelFilter: string;
    setChannelFilter: (value: string) => void;
    availableChannels: string[];
    queueCount: number;
    doneCount: number;
    totalCampaignItems: number;
    isLoading: boolean;
    isGenerating: boolean;
    selectedArtisanItemId: string | null;
    handleArtisanItemSelect: (id: string | null) => void;
    filteredArtisanItems: ArtisanItem[];
    offerings: Offering[];
    selectedOfferingId: string | undefined;
    setSelectedOfferingId: (id: string | undefined) => void;
    creativePrompt: string;
    setCreativePrompt: (value: string) => void;
    selectedCreativeFormat: string; // Changed from selectedCreativeType
    setSelectedCreativeFormat: (formatValue: string) => void; // Changed
    setSelectedCreativeType: (type: CreativeType) => void; // Keep this to control preview
    dimension: string; // Keep as string for flexibility
    setDimension: (dim: string) => void;
    scheduledAt: Date | null;
    handleDateTimeChange: (date: Date | undefined, time: string) => void;
    handleGenerate: (prompt?: string) => void;
    isGenerateDisabled: boolean;
    isSaving: boolean;
    handleSave: (status: 'ready_for_review' | 'scheduled', scheduleDate?: Date | null) => void;
    hasContent: boolean;
    onSelectCampaign: () => void;
    isSaved: boolean;
    onDelete: () => void;
    isUpdate: boolean;
    currentChannel: string | null;
};

export const CreativeControls: React.FC<CreativeControlsProps> = ({
    workflowMode,
    allArtisanItems,
    channelFilter,
    setChannelFilter,
    availableChannels,
    queueCount,
    doneCount,
    totalCampaignItems,
    isLoading,
    isGenerating,
    selectedArtisanItemId,
    handleArtisanItemSelect,
    filteredArtisanItems,
    offerings,
    selectedOfferingId,
    setSelectedOfferingId,
    creativePrompt,
    setCreativePrompt,
    selectedCreativeFormat,
    setSelectedCreativeFormat,
    setSelectedCreativeType,
    dimension,
    setDimension,
    scheduledAt,
    handleDateTimeChange,
    handleGenerate,
    isGenerateDisabled,
    isSaving,
    handleSave,
    hasContent,
    onSelectCampaign,
    isSaved,
    onDelete,
    isUpdate,
    currentChannel,
}) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Creative Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        );
    }
    const availableFormats = React.useMemo(() => {
        if (!currentChannel && workflowMode !== 'custom') return [];
        const allFormats = mediaFormatConfig.flatMap(cat => cat.formats);
        if (workflowMode === 'custom') return allFormats;
        return allFormats.filter(format => format.channels.includes(currentChannel!.toLowerCase()));
    }, [currentChannel, workflowMode]);

    const availableAspectRatios = React.useMemo(() => {
        const format = availableFormats.find(f => f.value === selectedCreativeFormat);
        return format ? format.aspect_ratios : [];
    }, [selectedCreativeFormat, availableFormats]);

    React.useEffect(() => {
        // When the available aspect ratios change (due to a format change),
        // reset the dimension to the first available option, or clear it if none are available.
        if (availableAspectRatios.length > 0) {
            if (!availableAspectRatios.some(ar => ar.value === dimension)) {
                setDimension(availableAspectRatios[0].value);
            }
        } else {
            setDimension(''); // No aspect ratios for this format
        }
    }, [availableAspectRatios, dimension, setDimension]);

    const handleFormatChange = (formatValue: string) => {
        const format = availableFormats.find(f => f.value === formatValue);
        if (format) {
            setSelectedCreativeFormat(format.value);
            setSelectedCreativeType(format.creativeType);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Creative Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 {workflowMode === 'campaign' && (
                    <Tabs value={channelFilter} onValueChange={(value) => setChannelFilter(value)} className="w-full">
                        <div className="flex justify-center">
                            <TabsList>
                                <TabsTrigger value="all">Pending ({queueCount})</TabsTrigger>
                                {availableChannels.map(channel => (
                                    <TabsTrigger key={channel} value={channel} className="capitalize">{channel} ({allArtisanItems.filter(i => i.user_channel_settings?.channel_name === channel).length})</TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </Tabs>
                )}

                {workflowMode === 'campaign' && (
                    <div className="space-y-2">
                        <Label htmlFor="queue-select" className="flex items-center justify-between">
                            <span className="truncate">Choose an Item to Work On</span>
                            {workflowMode === 'campaign' && totalCampaignItems > 0 && (
                                <span className="text-sm font-medium text-muted-foreground">
                                    ({doneCount}/{totalCampaignItems})
                                </span>
                            )}
                        </Label>
                        <Select onValueChange={(value) => handleArtisanItemSelect(value)} disabled={isLoading} value={selectedArtisanItemId || ''}>
                            <SelectTrigger id="queue-select">
                                <SelectValue>
                                    {filteredArtisanItems.find(item => item.id === selectedArtisanItemId)?.concept || "Select a content idea..."}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                filteredArtisanItems.length > 0 ? (
                                    filteredArtisanItems.map(item => {
                                        const StatusIcon = item.status === 'ready_for_review' || item.status === 'scheduled' || item.status === 'published' ? CheckCircle2 : CircleDashed;
                                        return (
                                            <SelectItem key={item.id} value={item.id}>
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon className="h-4 w-4 text-muted-foreground" />
                                                    <span className="truncate">{item.concept || 'Untitled Concept'}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })
                                ) : (
                                    <SelectItem value="none" disabled>No pending items.</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
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
                        <Label htmlFor="creative-prompt">AI Creative Prompt</Label>
                    </div>
                    <Textarea
                        id="creative-prompt"
                        value={creativePrompt}
                        onChange={(e) => setCreativePrompt(e.target.value)}
                        placeholder="e.g., A minimalist photo of a steaming mug of cacao on a rustic wooden table..."
                        className="h-24 resize-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="creative-type-select">Creative Format</Label>
                        <Select onValueChange={handleFormatChange} disabled={isLoading || availableFormats.length === 0} value={selectedCreativeFormat}>
                            <SelectTrigger id="creative-type-select">
                                <SelectValue placeholder="Select format..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableFormats.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {availableAspectRatios.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor="dimension-select">Aspect Ratio</Label>
                            <Select onValueChange={setDimension} disabled={isLoading} value={dimension}>
                                <SelectTrigger id="dimension-select">
                                    <SelectValue placeholder="Select aspect ratio..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableAspectRatios.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                
                <div className="space-y-2">
                    <Label>Schedule Publication</Label>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !scheduledAt && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduledAt ? format(scheduledAt, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={scheduledAt || undefined}
                                    onSelect={(d) => handleDateTimeChange(d, scheduledAt ? format(scheduledAt, 'HH:mm') : '09:00')}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Select
                            value={scheduledAt ? format(scheduledAt, 'HH:mm') : ''}
                            onValueChange={(time) => handleDateTimeChange(scheduledAt || new Date(), time)}
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button onClick={() => handleGenerate(creativePrompt)} className="w-full" disabled={isGenerateDisabled}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                </Button>

                <Separator />

                <div className="w-full flex items-center justify-between gap-2">
                    {/* Show "Save" only for NEW custom content */}
                    {workflowMode === 'custom' && !isUpdate && (
                        <Button 
                            onClick={() => handleSave('ready_for_review')} 
                            className="flex-grow" 
                            disabled={isSaving || !hasContent}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </Button>
                    )}

                    {/* Show "Update" for campaign content OR for saved custom content */}
                    {(workflowMode === 'campaign' || isUpdate) && (
                        <>
                            {isSaved && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" disabled={isSaving}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the
                                                content from your media plan.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            <Button 
                                onClick={() => handleSave('ready_for_review')} 
                                variant="secondary"
                                className="flex-grow" 
                                disabled={isSaving || !hasContent}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? 'Updating...' : 'Update Draft'}
                            </Button>
                        </>
                    )}

                    <Button onClick={() => handleSave('scheduled', scheduledAt)} className="flex-grow" disabled={isSaving || !hasContent || !scheduledAt}>
                        Schedule Post
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
    
    
    