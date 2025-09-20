

'use client';

import * as React from 'react';
import { useState, useTransition, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Funnel, generateMediaPlan as generateMediaPlanAction, regeneratePlanItem, saveMediaPlan, addToArtisanQueue, addMultipleToArtisanQueue } from '../actions';
import { getOfferings, Offering } from '@/app/offerings/actions';
import { Stars, Sparkles, RefreshCw, Trash2, PlusCircle, CheckCircle2, ListPlus, Rows, X, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format, parseISO, setHours, setMinutes, isValid } from 'date-fns';


interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnel: Funnel;
    onPlanSaved: () => void;
}

type PlanItemWithId = PlanItem & { id: string };
type RegeneratingState = { [itemId: string]: boolean };

const mediaFormatConfig = [
    { label: "Image", formats: [ { value: '1:1 Square Image', channels: ['instagram', 'facebook'] }, { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] }, { value: '9:16 Story Image', channels: ['instagram', 'facebook'] }, ] },
    { label: "Video", formats: [ { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] }, { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] }, { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] }, ] },
    { label: "Text & Communication", formats: [ { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] }, { value: 'Newsletter', channels: ['webmail'] }, { value: 'Promotional Email', channels: ['webmail'] }, { value: 'Blog Post', channels: ['website'] }, { value: 'Text Message', channels: ['whatsapp', 'telegram'] }, ] }
];

const getFormatsForChannel = (channel: string): string[] => {
    const channelLower = channel.toLowerCase();
    return mediaFormatConfig.flatMap(category => 
        category.formats.filter(format => format.channels.includes(channelLower)).map(format => format.value)
    );
};

export function OrchestrateMediaPlanDialog({
    isOpen,
    onOpenChange,
    funnel,
    onPlanSaved,
}: OrchestrateMediaPlanDialogProps) {
    const [planItems, setPlanItems] = useState<PlanItemWithId[]>([]);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isRegenerating, setIsRegenerating] = useState<RegeneratingState>({});
    const [isAddingToQueue, setIsAddingToQueue] = useState<RegeneratingState>({});
    const [queuedItemIds, setQueuedItemIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 6),
    });
    
    const { toast } = useToast();

    const groupedByChannel = useMemo(() => {
        return planItems.reduce((acc, item) => {
            const channelKey = item.channel || 'General';
            if (!acc[channelKey]) acc[channelKey] = [];
            acc[channelKey].push(item);
            return acc;
        }, {} as Record<string, PlanItemWithId[]>);
    }, [planItems]);
    const channelsForTabs = Object.keys(groupedByChannel);

    useEffect(() => {
        if (isOpen) {
            const existingPlan = funnel.media_plans?.plan_items;
            if (existingPlan) {
                validateAndSetPlanItems(existingPlan);
            } else {
                setPlanItems([]);
            }
            setQueuedItemIds(new Set());
            setIsSelectionMode(false);
            setSelectedItemIds(new Set());
            if (channelsForTabs.length > 0 && !activeTab) {
                setActiveTab(channelsForTabs[0]);
            }
        }
    }, [isOpen, funnel]);

    useEffect(() => {
        if(channelsForTabs.length > 0 && !channelsForTabs.includes(activeTab)) {
            setActiveTab(channelsForTabs[0] || '');
        }
    }, [channelsForTabs, activeTab]);

    const validateAndSetPlanItems = (items: PlanItem[]) => {
        const validatedItems = items.map(item => {
            const validFormats = getFormatsForChannel(item.channel);
            const formatIsValid = validFormats.includes(item.format);
            return {
                ...item,
                format: formatIsValid ? item.format : (validFormats[0] || 'Blog Post'),
                id: crypto.randomUUID(),
            };
        });
        setPlanItems(validatedItems);
    };

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({
                    funnelId: funnel.id,
                    startDate: dateRange?.from?.toISOString(),
                    endDate: dateRange?.to?.toISOString(),
                });
                validateAndSetPlanItems(result.plan);
                toast({
                    title: 'Media Plan Generated!',
                    description: 'Review and edit the suggested content ideas below.'
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Media Plan Generation Failed',
                    description: error.message,
                });
            }
        });
    };

    const handleSave = () => {
        startSaving(async () => {
            try {
                const planToSave = planItems.map(({id, ...rest}) => rest);
                await saveMediaPlan(funnel.id, planToSave);
                onPlanSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };
    
    const handleRegenerateItem = async (itemToRegen: PlanItemWithId) => {
        if (!itemToRegen.conceptualStep) return;
        setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true }));
        try {
            const newItem = await regeneratePlanItem({ funnelId: funnel.id, channel: itemToRegen.channel, conceptualStep: itemToRegen.conceptualStep });
            const validFormats = getFormatsForChannel(newItem.channel);
            const formatIsValid = validFormats.includes(newItem.format);
            
            setPlanItems(prev => prev.map(item => {
                if (item.id === itemToRegen.id) {
                    return {
                        ...newItem,
                        conceptualStep: {
                            ...itemToRegen.conceptualStep,
                            ...(newItem.conceptualStep || {}),
                        },
                        id: itemToRegen.id,
                        format: formatIsValid ? newItem.format : (validFormats[0] || 'Blog Post'),
                    };
                }
                return item;
            }));

            toast({ title: 'Item Regenerated!', description: 'The content idea has been updated.'});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Regeneration Failed', description: error.message });
        } finally {
            setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: false }));
        }
    };

    const handleAddToQueue = (item: PlanItemWithId) => {
        setIsAddingToQueue(prev => ({ ...prev, [item.id]: true }));
        const { id, ...planItem } = item;
        addToArtisanQueue(funnel.id, planItem)
            .then(() => {
                toast({
                    title: 'Added to Queue!',
                    description: 'This item is now ready for generation in the AI Artisan workshop.'
                });
                setQueuedItemIds(prev => new Set(prev).add(id));
            })
            .catch((error: any) => {
                toast({
                    variant: 'destructive',
                    title: 'Failed to Add to Queue',
                    description: error.message
                });
            })
            .finally(() => {
                setIsAddingToQueue(prev => ({ ...prev, [item.id]: false }));
            });
    }

    const handleBulkAddToQueue = () => {
        const itemsToAdd = planItems.filter(item => selectedItemIds.has(item.id) && !queuedItemIds.has(item.id));
        if (itemsToAdd.length === 0) {
            toast({ title: 'No new items to add', description: 'All selected items are already in the queue.' });
            return;
        }

        const itemsPayload = itemsToAdd.map(({ id, ...rest }) => rest);
        startSaving(async () => {
            try {
                const { count } = await addMultipleToArtisanQueue(funnel.id, itemsPayload);
                toast({ title: 'Success!', description: `${count} item(s) added to the Artisan Queue.` });
                const newQueuedIds = new Set(queuedItemIds);
                itemsToAdd.forEach(item => newQueuedIds.add(item.id));
                setQueuedItemIds(newQueuedIds);
                setSelectedItemIds(new Set());
                setIsSelectionMode(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Bulk Add Failed', description: error.message });
            }
        });
    }

    const handleItemChange = (itemId: string, field: 'format' | 'copy' | 'hashtags' | 'creativePrompt' | 'suggested_post_at', value: string) => {
        setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };

    const handleStageNameChange = (itemId: string, value: string) => {
        setPlanItems(prev => prev.map(item => {
            if (item.id === itemId && item.conceptualStep) {
                return { ...item, conceptualStep: { ...item.conceptualStep, stageName: value } };
            }
            return item;
        }));
    };

    const handleObjectiveChange = (itemId: string, value: string) => {
        setPlanItems(prev => prev.map(item => {
            if (item.id === itemId && item.conceptualStep) {
                return { ...item, conceptualStep: { ...item.conceptualStep, objective: value } };
            }
            return item;
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setPlanItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddNewItem = (channel: string) => {
        const newItem: PlanItemWithId = {
            id: crypto.randomUUID(),
            offeringId: funnel.offering_id || '',
            channel: channel,
            format: getFormatsForChannel(channel)[0] || 'Blog Post',
            copy: '',
            hashtags: '',
            creativePrompt: '',
            conceptualStep: { objective: 'Your new objective here', stageName: 'Uncategorized' },
        };
        setPlanItems(prev => [...prev, newItem]);
    };
    
    const handleToggleSelectionMode = () => {
        setIsSelectionMode(prev => !prev);
        setSelectedItemIds(new Set());
    }

    const handleItemSelection = (itemId: string, checked: boolean) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const currentTabItemIds = (groupedByChannel[activeTab] || []).map(item => item.id);
            setSelectedItemIds(new Set(currentTabItemIds));
        } else {
            setSelectedItemIds(new Set());
        }
    }

    const currentTabItems = groupedByChannel[activeTab] || [];
    const isAllSelected = currentTabItems.length > 0 && currentTabItems.every(item => selectedItemIds.has(item.id));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                         <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Orchestrate Media Plan</DialogTitle>
                        {planItems.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleToggleSelectionMode}>
                                {isSelectionMode ? <><X className="mr-2 h-4 w-4"/>Cancel</> : <><Rows className="mr-2 h-4 w-4"/>Bulk Select</>}
                            </Button>
                        )}
                    </div>
                    <DialogDescription>Generate, edit, and approve the tactical content pieces for the '{funnel.name}' strategy.</DialogDescription>
                    {isSelectionMode && (
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
                            <Label htmlFor="select-all">Select all on this tab</Label>
                        </div>
                    )}
                </DialogHeader>
                <div className="max-h-[60vh] flex flex-col overflow-hidden py-4">
                    {isGenerating ? (
                        <div className="space-y-4 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
                    ) : planItems.length > 0 ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                            <div className="flex justify-center"><TabsList>{channelsForTabs.map(c => (<TabsTrigger key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</TabsTrigger>))}</TabsList></div>
                            <div className="flex-1 overflow-y-auto mt-4 pr-4">
                                {channelsForTabs.map(c => (
                                    <TabsContent key={c} value={c} className="mt-0">
                                        <div className="space-y-4">{groupedByChannel[c].map((item) => {
                                            const postDate = item.suggested_post_at ? parseISO(item.suggested_post_at) : null;
                                            const formattedDate = isValid(postDate) ? format(postDate as Date, "MMM d, yyyy, h:mm a") : "Not set";
                                            const timeValue = isValid(postDate) ? format(postDate as Date, "HH:mm") : "";

                                            return (
                                            <div key={item.id} className={cn("p-4 border rounded-lg space-y-4 relative transition-all", isSelectionMode && "pr-12", selectedItemIds.has(item.id) && "ring-2 ring-primary border-primary")}>
                                                {isSelectionMode && <Checkbox checked={selectedItemIds.has(item.id)} onCheckedChange={(checked) => handleItemSelection(item.id, !!checked)} className="absolute top-4 left-4 h-5 w-5"/>}
                                                <div className={cn("absolute top-2 right-2 flex items-center gap-2", isSelectionMode && "hidden")}>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRegenerateItem(item)} disabled={isRegenerating[item.id]}><RefreshCw className={`h-4 w-4 ${isRegenerating[item.id] ? 'animate-spin' : ''}`} /></Button>
                                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                                <div className={cn("space-y-4", isSelectionMode && "pl-8")}>
                                                    <div className="space-y-1"><Label htmlFor={`stageName-${item.id}`}>Strategy Stage</Label><Input id={`stageName-${item.id}`} value={item.conceptualStep?.stageName || 'Uncategorized'} onChange={(e) => handleStageNameChange(item.id, e.target.value)} className="font-semibold bg-muted/50" /></div>
                                                    <div className="space-y-1"><Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label><Input id={`objective-${item.id}`} value={item.conceptualStep?.objective || ''} onChange={(e) => handleObjectiveChange(item.id, e.target.value)} placeholder="e.g., Build social proof"/></div>
                                                    <div className="space-y-1"><Label htmlFor={`format-${item.id}`}>Format</Label><Select value={item.format} onValueChange={(v) => handleItemChange(item.id, 'format', v)}><SelectTrigger id={`format-${item.id}`} className="font-semibold"><SelectValue placeholder="Select a format" /></SelectTrigger><SelectContent>{mediaFormatConfig.map(g => { const channelFormats = g.formats.filter(f => f.channels.includes(item.channel.toLowerCase())); if (channelFormats.length === 0) return null; return (<SelectGroup key={g.label}><SelectLabel>{g.label}</SelectLabel>{channelFormats.map(f => (<SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>))}</SelectGroup>) })}</SelectContent></Select></div>
                                                    <div className="space-y-1"><Label htmlFor={`hashtags-${item.id}`}>Hashtags / Keywords</Label><Input id={`hashtags-${item.id}`} value={item.hashtags} onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)}/></div>
                                                    <div className="space-y-1"><Label htmlFor={`copy-${item.id}`}>Copy</Label><Textarea id={`copy-${item.id}`} value={item.copy} onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)} className="text-sm" rows={4}/></div>
                                                    <div className="space-y-1"><Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label><Textarea id={`prompt-${item.id}`} value={item.creativePrompt} onChange={(e) => handleItemChange(item.id, 'creativePrompt', e.target.value)} className="text-sm font-mono" rows={3}/></div>
                                                    
                                                     <div className="space-y-2">
                                                        <Label>Suggested Post Time</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                    "w-[240px] justify-start text-left font-normal",
                                                                    !postDate && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {postDate ? format(postDate, "PPP") : <span>Pick a date</span>}
                                                                </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={postDate || undefined}
                                                                    onSelect={(date) => {
                                                                        const newDate = date ? setHours(setMinutes(date, postDate?.getMinutes() || 0), postDate?.getHours() || 0) : null;
                                                                        handleItemChange(item.id, 'suggested_post_at', newDate?.toISOString() || '');
                                                                    }}
                                                                    initialFocus
                                                                />
                                                                </PopoverContent>
                                                            </Popover>
                                                             <Input
                                                                type="time"
                                                                value={timeValue}
                                                                onChange={(e) => {
                                                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                                                    const newDate = postDate ? setHours(setMinutes(postDate, minutes), hours) : null;
                                                                    handleItemChange(item.id, 'suggested_post_at', newDate?.toISOString() || '');
                                                                }}
                                                                className="w-[120px]"
                                                            />
                                                        </div>
                                                    </div>

                                                    <Button size="sm" onClick={() => handleAddToQueue(item)} disabled={isAddingToQueue[item.id] || queuedItemIds.has(item.id)} className={cn(isSelectionMode && "hidden")}>
                                                        {queuedItemIds.has(item.id) ? ( <><CheckCircle2 className="mr-2 h-4 w-4"/>Queued</> ) : ( <><ListPlus className="mr-2 h-4 w-4"/>Add to Artisan Queue</> )}
                                                    </Button>
                                                </div>
                                            </div>
                                            )
                                        })}</div>
                                        <div className="flex justify-center mt-6"><Button variant="outline" onClick={() => handleAddNewItem(c)}><PlusCircle className="mr-2 h-4 w-4" />Add New Idea to this Channel</Button></div>
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    ) : (
                        <div className="text-center text-muted-foreground py-10 flex-1 flex flex-col items-center justify-center">
                            <Stars className="h-12 w-12 mb-4" />
                            <h3 className="font-semibold text-lg">No media plan exists for this strategy yet.</h3>
                             <div className="grid gap-2 text-left my-4">
                                <Label htmlFor="dates">Campaign Dates</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="dates"
                                        variant={"outline"}
                                        className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                        ) : (
                                        <span>Pick a date range</span>
                                        )}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button className="mt-2" onClick={handleGeneratePlan} disabled={isGenerating || !dateRange?.from || !dateRange?.to}>
                                {isGenerating ? 'Generating...' : 'Generate Media Plan'}
                            </Button>
                        </div>
                    )}
                </div>
                 <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isGenerating}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isGenerating || planItems.length === 0}>{isSaving ? 'Saving...' : 'Save Plan & Close'}</Button>
                </DialogFooter>

                 {isSelectionMode && (
                    <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 flex items-center justify-between animate-in slide-in-from-bottom-12 duration-300">
                        <p className="text-sm font-semibold">{selectedItemIds.size} item(s) selected</p>
                        <Button onClick={handleBulkAddToQueue} disabled={selectedItemIds.size === 0 || isSaving}>
                            <ListPlus className="mr-2 h-4 w-4" />
                            Add to Queue
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
