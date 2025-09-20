

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
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Funnel, MediaPlan, generateMediaPlan as generateMediaPlanAction, regeneratePlanItem, saveMediaPlan, addToArtisanQueue, addMultipleToArtisanQueue, getUserChannels, deleteMediaPlan } from '../actions';
import { Stars, Sparkles, RefreshCw, Trash2, PlusCircle, CheckCircle2, ListPlus, Rows, X, Calendar as CalendarIcon, ArrowLeft, MoreVertical, Edit, Eye } from 'lucide-react';
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
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';


interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnel: Funnel;
    onRefresh: () => void;
}

type PlanItemWithId = PlanItem & { id: string };
type RegeneratingState = { [itemId: string]: boolean };

type ViewState = 'list' | 'generate' | 'edit' | 'view';

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
    funnel: initialFunnel,
    onRefresh,
}: OrchestrateMediaPlanDialogProps) {
    const [funnel, setFunnel] = useState<Funnel>(initialFunnel);
    const [view, setView] = useState<ViewState>('list');
    const [currentPlan, setCurrentPlan] = useState<PlanItemWithId[] | null>(null);
    const [planToView, setPlanToView] = useState<MediaPlan | null>(null);
    const [planIdToEdit, setPlanIdToEdit] = useState<string | null>(null);
    const [planTitle, setPlanTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
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
    const [availableChannels, setAvailableChannels] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    
    const { toast } = useToast();

    const refreshFunnelData = () => {
        // This function will be passed to the parent to trigger a refresh.
        // It's a bit of a workaround for not having a direct way to refetch server data.
        onRefresh();
    };

    useEffect(() => {
        setFunnel(initialFunnel);
        if (isOpen) {
            setView(initialFunnel.media_plans && initialFunnel.media_plans.length > 0 ? 'list' : 'generate');
            setCurrentPlan(null);
            setPlanIdToEdit(null);
            setPlanToView(null);
            setQueuedItemIds(new Set());
            setIsSelectionMode(false);
            setSelectedItemIds(new Set());

            getUserChannels().then(channels => {
                const channelNames = channels.map(c => c.id);
                setAvailableChannels(channelNames);
                setSelectedChannels(initialFunnel.strategy_brief?.channels?.filter(c => channelNames.includes(c)) || []);
            });

            if (dateRange?.from) {
                setPlanTitle(`Campaign for ${format(dateRange.from, 'LLL dd, y')}`);
            }
        }
    }, [isOpen, initialFunnel, dateRange?.from]);

    useEffect(() => {
        if (dateRange?.from && view === 'generate') {
            setPlanTitle(`Campaign for ${format(dateRange.from, 'LLL dd, y')}`);
        }
    }, [dateRange, view]);

    const planItemsForCurrentView = useMemo(() => {
        return view === 'edit' ? currentPlan : planToView?.media_plan_items || [];
    }, [view, currentPlan, planToView]);

    const groupedByChannel = useMemo(() => {
        if (!planItemsForCurrentView) return {};
        return planItemsForCurrentView.reduce((acc, item) => {
            const channelKey = item.channel || 'General';
            if (!acc[channelKey]) acc[channelKey] = [];
            acc[channelKey].push(item as PlanItemWithId);
            return acc;
        }, {} as Record<string, PlanItemWithId[]>);
    }, [planItemsForCurrentView]);

    const channelsForTabs = Object.keys(groupedByChannel);
    
    useEffect(() => {
        if(channelsForTabs.length > 0 && !channelsForTabs.includes(activeTab)) {
            setActiveTab(channelsForTabs[0] || '');
        } else if (channelsForTabs.length === 0) {
            setActiveTab('');
        }
    }, [channelsForTabs, activeTab]);

    const validateAndSetPlanItems = (items: PlanItem[]) => {
        const validatedItems = items.map(item => {
            const validFormats = getFormatsForChannel(item.channel);
            const formatIsValid = validFormats.includes(item.format);
            return {
                ...item,
                format: formatIsValid ? item.format : (validFormats[0] || 'Blog Post'),
                id: (item as any).id || crypto.randomUUID(),
            };
        });
        setCurrentPlan(validatedItems);
    };

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({
                    funnelId: funnel.id,
                    startDate: dateRange?.from?.toISOString(),
                    endDate: dateRange?.to?.toISOString(),
                    channels: selectedChannels,
                });
                validateAndSetPlanItems(result.plan);
                setView('edit');
                setPlanIdToEdit(null); // This is a new plan
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
        if (!currentPlan || !planTitle.trim()) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Please provide a title for the media plan.' });
            return;
        }
        startSaving(async () => {
            try {
                const planToSave = currentPlan.map(({id, ...rest}) => rest);
                const savedPlan = await saveMediaPlan({
                    id: planIdToEdit,
                    funnelId: funnel.id, 
                    title: planTitle, 
                    planItems: planToSave, 
                    startDate: dateRange?.from?.toISOString() ?? null, 
                    endDate: dateRange?.to?.toISOString() ?? null
                });
                toast({ title: 'Plan Saved!', description: 'Your changes have been saved.' });
                setPlanIdToEdit(savedPlan.id);
                refreshFunnelData(); // Refresh parent data
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };

    const handleDeletePlan = (planId: string) => {
        startDeleting(async () => {
            try {
                await deleteMediaPlan(planId);
                toast({ title: "Plan Deleted", description: "The media plan has been successfully deleted." });
                setFunnel(prevFunnel => ({
                    ...prevFunnel,
                    media_plans: prevFunnel.media_plans?.filter(p => p.id !== planId) || null,
                }));
                setView('list');
                refreshFunnelData();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    };
    
    const handleRegenerateItem = async (itemToRegen: PlanItemWithId) => {
        setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true }));
        try {
            const newItem = await regeneratePlanItem({ 
                funnelId: funnel.id, 
                channel: itemToRegen.channel, 
                stageName: itemToRegen.stageName,
                objective: itemToRegen.objective,
                concept: itemToRegen.concept,
            });
            const validFormats = getFormatsForChannel(newItem.channel);
            const formatIsValid = validFormats.includes(newItem.format);
            
            setCurrentPlan(prev => prev!.map(item => {
                if (item.id === itemToRegen.id) {
                    return {
                        ...newItem,
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
        if (!currentPlan) return;
        const itemsToAdd = currentPlan.filter(item => selectedItemIds.has(item.id) && !queuedItemIds.has(item.id));
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

    const handleItemChange = (itemId: string, field: keyof Omit<PlanItem, 'offeringId'>, value: string) => {
        setCurrentPlan(prev => prev!.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };

    const handleRemoveItem = (itemId: string) => {
        setCurrentPlan(prev => prev!.filter(item => item.id !== itemId));
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
            stageName: 'New Stage',
            objective: 'Your new objective here',
            concept: 'Your new concept here',
        };
        setCurrentPlan(prev => [...(prev || []), newItem]);
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

    const handleChannelToggle = (channel: string) => {
        setSelectedChannels(prev =>
            prev.includes(channel)
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        );
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

    const renderListView = () => (
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <Button onClick={() => setView('generate')} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Media Plan
            </Button>
            <h3 className="text-lg font-semibold">Previous Media Plans</h3>
            {funnel.media_plans && funnel.media_plans.length > 0 ? (
                funnel.media_plans.map(plan => (
                    <Card key={plan.id}>
                        <CardHeader className="cursor-pointer" onClick={() => {
                            setPlanToView(plan);
                            setView('view');
                        }}>
                             <CardTitle>{plan.title}</CardTitle>
                             <CardDescription>Created on {plan.created_at ? format(parseISO(plan.created_at), 'PPP') : 'N/A'}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => {
                                setPlanToView(plan);
                                setView('view');
                            }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                                validateAndSetPlanItems((plan.media_plan_items as PlanItem[]) || []);
                                setPlanTitle(plan.title);
                                setPlanIdToEdit(plan.id);
                                setDateRange({ from: plan.campaign_start_date ? parseISO(plan.campaign_start_date) : undefined, to: plan.campaign_end_date ? parseISO(plan.campaign_end_date) : undefined });
                                setView('edit');
                            }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the media plan titled "{plan.title}".
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePlan(plan.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <p className="text-muted-foreground text-center py-4">No media plans created for this strategy yet.</p>
            )}
        </div>
    );
    
    const renderGenerateView = () => (
        <div className="text-muted-foreground py-10 flex-1 flex flex-col">
            <Button variant="ghost" onClick={() => setView('list')} className="self-start mb-4"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Stars className="h-12 w-12 mb-4" />
                <h3 className="font-semibold text-lg text-foreground">Generate a New Media Plan</h3>
                <div className="grid gap-6 text-left my-6 max-w-md w-full">
                    <div className="space-y-2">
                        <Label htmlFor="plan-title">Campaign Title</Label>
                        <Input id="plan-title" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="dates">Campaign Dates</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="dates"
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
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
                    <div className="space-y-2">
                        <Label>Select Target Channels</Label>
                        <div className="grid grid-cols-2 gap-2 p-4 border rounded-md">
                            {availableChannels.map(c => (
                                <div key={c} className="flex items-center space-x-2">
                                    <Checkbox id={`c-${c}`} checked={selectedChannels.includes(c)} onCheckedChange={() => handleChannelToggle(c)} />
                                    <Label htmlFor={`c-${c}`} className="capitalize cursor-pointer">{c.replace(/_/g, ' ')}</Label>
                                </div>
                            ))}
                        </div>
                         {availableChannels.length === 0 && <p className="text-muted-foreground text-center text-sm">No channels enabled. Go to Accounts to enable them.</p>}
                    </div>
                </div>
                <Button className="mt-2" onClick={handleGeneratePlan} disabled={isGenerating || !dateRange?.from || !dateRange?.to || !planTitle.trim() || selectedChannels.length === 0}>
                    {isGenerating ? 'Generating...' : 'Generate Media Plan'}
                </Button>
            </div>
        </div>
    );
    
    const renderSharedPlanView = (isEdit: boolean) => {
         if (isGenerating) return <div className="space-y-4 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
         if (!planItemsForCurrentView) return <p>Something went wrong.</p>;

         return (
             <div className="max-h-[60vh] flex flex-col overflow-hidden py-4">
                <div className="flex justify-between items-center mb-4">
                    <Button variant="ghost" onClick={() => setView('list')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                    {isEdit && planItemsForCurrentView.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleToggleSelectionMode}>
                            {isSelectionMode ? <><X className="mr-2 h-4 w-4"/>Cancel</> : <><Rows className="mr-2 h-4 w-4"/>Bulk Select</>}
                        </Button>
                    )}
                </div>
                 {isEdit && isSelectionMode && (
                    <div className="flex items-center space-x-2 pb-2">
                        <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={(checked) => handleSelectAll(!!checked)} />
                        <Label htmlFor="select-all">Select all on this tab</Label>
                    </div>
                )}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                    <div className="flex justify-center"><TabsList>{channelsForTabs.map(c => (<TabsTrigger key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</TabsTrigger>))}</TabsList></div>
                    <div className="flex-1 overflow-y-auto mt-4 pr-4">
                        {channelsForTabs.map(c => (
                            <TabsContent key={c} value={c} className="mt-0">
                                <div className="space-y-4">{groupedByChannel[c]?.map((item) => {
                                    const postDate = item.suggested_post_at ? parseISO(item.suggested_post_at) : null;
                                    const timeValue = postDate && isValid(postDate) ? format(postDate, "HH:mm") : "";
                                    return (
                                    <div key={item.id} className={cn("p-4 border rounded-lg space-y-4 relative transition-all", isEdit && isSelectionMode && "pr-12", selectedItemIds.has(item.id) && "ring-2 ring-primary border-primary")}>
                                        {isEdit && isSelectionMode && <Checkbox checked={selectedItemIds.has(item.id)} onCheckedChange={(checked) => handleItemSelection(item.id, !!checked)} className="absolute top-4 left-4 h-5 w-5"/>}
                                        {isEdit && (
                                            <div className={cn("absolute top-2 right-2 flex items-center gap-2", isSelectionMode && "hidden")}>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRegenerateItem(item)} disabled={isRegenerating[item.id]}><RefreshCw className={`h-4 w-4 ${isRegenerating[item.id] ? 'animate-spin' : ''}`} /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                        <div className={cn("space-y-4", isEdit && isSelectionMode && "pl-8")}>
                                            <div className="space-y-1"><Label htmlFor={`stageName-${item.id}`}>Strategy Stage</Label><Input id={`stageName-${item.id}`} value={item.stageName || 'Uncategorized'} onChange={(e) => handleItemChange(item.id, 'stageName', e.target.value)} className="font-semibold bg-muted/50" readOnly={!isEdit} /></div>
                                            <div className="space-y-1"><Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label><Input id={`objective-${item.id}`} value={item.objective || ''} onChange={(e) => handleItemChange(item.id, 'objective', e.target.value)} placeholder="e.g., Build social proof" readOnly={!isEdit}/></div>
                                            <div className="space-y-1"><Label htmlFor={`concept-${item.id}`}>Concept</Label><Textarea id={`concept-${item.id}`} value={item.concept || ''} onChange={(e) => handleItemChange(item.id, 'concept', e.target.value)} rows={2} readOnly={!isEdit}/></div>
                                            <div className="space-y-1"><Label htmlFor={`format-${item.id}`}>Format</Label><Select value={item.format} onValueChange={(v) => handleItemChange(item.id, 'format', v)} disabled={!isEdit}><SelectTrigger id={`format-${item.id}`} className="font-semibold"><SelectValue placeholder="Select a format" /></SelectTrigger><SelectContent>{mediaFormatConfig.map(g => { const channelFormats = g.formats.filter(f => f.channels.includes(item.channel.toLowerCase())); if (channelFormats.length === 0) return null; return (<SelectGroup key={g.label}><SelectLabel>{g.label}</SelectLabel>{channelFormats.map(f => (<SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>))}</SelectGroup>) })}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label htmlFor={`hashtags-${item.id}`}>Hashtags / Keywords</Label><Input id={`hashtags-${item.id}`} value={item.hashtags} onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)} readOnly={!isEdit}/></div>
                                            <div className="space-y-1"><Label htmlFor={`copy-${item.id}`}>Copy</Label><Textarea id={`copy-${item.id}`} value={item.copy} onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)} className="text-sm" rows={4} readOnly={!isEdit}/></div>
                                            <div className="space-y-1"><Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label><Textarea id={`prompt-${item.id}`} value={item.creativePrompt} onChange={(e) => handleItemChange(item.id, 'creativePrompt', e.target.value)} className="text-sm font-mono" rows={3} readOnly={!isEdit}/></div>
                                            <div className="space-y-2">
                                                <Label>Suggested Post Time</Label>
                                                <div className="flex items-center gap-2">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !postDate && "text-muted-foreground")} disabled={!isEdit}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {postDate && isValid(postDate) ? format(postDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={postDate && isValid(postDate) ? postDate : undefined} onSelect={(date) => { const newDate = date ? setHours(setMinutes(date, postDate?.getMinutes() || 0), postDate?.getHours() || 0) : null; handleItemChange(item.id, 'suggested_post_at', newDate?.toISOString() || '');}} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Input type="time" value={timeValue} onChange={(e) => { const [hours, minutes] = e.target.value.split(':').map(Number); const newDate = postDate ? setHours(setMinutes(postDate, minutes), hours) : null; handleItemChange(item.id, 'suggested_post_at', newDate?.toISOString() || ''); }} className="w-[120px]" readOnly={!isEdit}/>
                                                </div>
                                            </div>
                                            {isEdit && (<Button size="sm" onClick={() => handleAddToQueue(item)} disabled={isAddingToQueue[item.id] || queuedItemIds.has(item.id)} className={cn(isSelectionMode && "hidden")}>
                                                {queuedItemIds.has(item.id) ? ( <><CheckCircle2 className="mr-2 h-4 w-4"/>Queued</> ) : ( <><ListPlus className="mr-2 h-4 w-4"/>Add to Artisan Queue</> )}
                                            </Button>)}
                                        </div>
                                    </div>
                                    )
                                })}</div>
                                {isEdit && <div className="flex justify-center mt-6"><Button variant="outline" onClick={() => handleAddNewItem(c)}><PlusCircle className="mr-2 h-4 w-4" />Add New Idea to this Channel</Button></div>}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
             </div>
         );
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Orchestrate Media Plan</DialogTitle>
                     <DialogDescription>Generate, edit, and approve the tactical content pieces for the '{funnel.name}' strategy.</DialogDescription>
                </DialogHeader>
                
                {view === 'list' && renderListView()}
                {view === 'generate' && renderGenerateView()}
                {view === 'edit' && renderSharedPlanView(true)}
                {view === 'view' && renderSharedPlanView(false)}

                <DialogFooter className="mt-4 pt-4 border-t">
                     {view === 'view' && (
                        <Button onClick={() => {
                             validateAndSetPlanItems((planToView?.media_plan_items as PlanItem[]) || []);
                             setPlanTitle(planToView?.title || '');
                             setPlanIdToEdit(planToView?.id || null);
                             setDateRange({ from: planToView?.campaign_start_date ? parseISO(planToView.campaign_start_date) : undefined, to: planToView?.campaign_end_date ? parseISO(planToView.campaign_end_date) : undefined });
                             setView('edit');
                        }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit this Plan
                        </Button>
                    )}
                    {view === 'edit' && (
                         <Button onClick={handleSave} disabled={isSaving || isGenerating}>
                            {isSaving ? 'Saving...' : 'Save Plan'}
                        </Button>
                    )}
                </DialogFooter>

                 {view === 'edit' && isSelectionMode && (
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

    

    