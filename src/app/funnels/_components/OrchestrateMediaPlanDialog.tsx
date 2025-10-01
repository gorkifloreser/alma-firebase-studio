// @functional: This component and its related features (funnels, presets, media orchestration) are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-10-02

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
import { Funnel, MediaPlan, generateMediaPlan as generateMediaPlanAction, regeneratePlanItem, saveMediaPlan, addMultipleToArtisanQueue, getUserChannels, deleteMediaPlan, getFunnel, archiveMediaPlan } from '../actions';
import { Stars, Sparkles, RefreshCw, Trash2, PlusCircle, CheckCircle2, ListPlus, Rows, X, Calendar as CalendarIcon, ArrowLeft, MoreVertical, Edit, Eye, Check, Archive, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format, parseISO, setHours, setMinutes, isValid, isPast } from 'date-fns';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getProfile } from '@/app/settings/actions';
import { languages as languageList } from '@/lib/languages';
import { mediaFormatConfig } from '@/lib/media-formats';

type Profile = Awaited<ReturnType<typeof getProfile>>;


interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnel: Funnel;
    onPlanSaved: (newFunnelData: Funnel) => void;
}

type PlanItemWithStatus = PlanItem & {
    id: string;
    status: string;
};
type RegeneratingState = { [itemId: string]: boolean };

type ViewState = 'list' | 'generate';

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
    onPlanSaved,
}: OrchestrateMediaPlanDialogProps) {
    const [funnel, setFunnel] = useState<Funnel>(initialFunnel);
    const [view, setView] = useState<ViewState>('list');
    const [currentPlan, setCurrentPlan] = useState<PlanItemWithStatus[] | null>(null);
    const [planIdToEdit, setPlanIdToEdit] = useState<string | null>(null);
    const [planTitle, setPlanTitle] = useState('');
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [isArchiving, startArchiving] = useTransition();
    const [isRegenerating, setIsRegenerating] = useState<RegeneratingState>({});
    const [activeTab, setActiveTab] = useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 6),
    });
    const [availableChannels, setAvailableChannels] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [planStatusFilter, setPlanStatusFilter] = useState<'active' | 'archived'>('active');
    
    const { toast } = useToast();
    
    const languageNames = new Map(languageList.map(l => [l.value, l.label]));

    useEffect(() => {
        setFunnel(initialFunnel);
        if (isOpen) {
            getProfile().then(p => {
                setProfile(p);
                setSelectedLanguage(p?.primary_language || 'en');
            });

            if (!planIdToEdit && !currentPlan) {
                const newViewState = initialFunnel.media_plans && initialFunnel.media_plans.length > 0 ? 'list' : 'generate';
                setView(newViewState);
                setCurrentPlan(null);
                setPlanIdToEdit(null);
            }
            
            getUserChannels().then(channels => {
                const channelNames = channels.map(c => c.id);
                setAvailableChannels(channelNames);
                setSelectedChannels(initialFunnel.strategy_brief?.channels?.filter(c => channelNames.includes(c)) || []);
            });

            if (dateRange?.from && !planIdToEdit) {
                setPlanTitle(`Campaign for ${format(dateRange.from, 'LLL dd, y')}`);
            }
        }
    }, [isOpen, initialFunnel, planIdToEdit, currentPlan, dateRange?.from]);

    const groupedByChannel = useMemo(() => {
        if (!currentPlan) return {};
        return currentPlan.reduce((acc, item) => {
            const channelKey = item.user_channel_settings?.channel_name || 'General';
            if (!acc[channelKey]) acc[channelKey] = [];
            acc[channelKey].push(item as PlanItemWithStatus);
            return acc;
        }, {} as Record<string, PlanItemWithStatus[]>);
    }, [currentPlan]);

    const channelsForTabs = Object.keys(groupedByChannel);

    const isCurrentChannelApproved = useMemo(() => {
        if (!currentPlan || !activeTab) return false;
        const itemsForChannel = groupedByChannel[activeTab] || [];
        if (itemsForChannel.length === 0) return false;
        return itemsForChannel.every(item => item.status === 'approved');
    }, [activeTab, groupedByChannel, currentPlan]);
    
    useEffect(() => {
        if(channelsForTabs.length > 0 && !channelsForTabs.includes(activeTab)) {
            setActiveTab(channelsForTabs[0] || '');
        } else if (channelsForTabs.length === 0) {
            setActiveTab('');
        }
    }, [channelsForTabs, activeTab]);

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({
                    funnelId: funnel.id,
                    startDate: dateRange?.from?.toISOString(),
                    endDate: dateRange?.to?.toISOString(),
                    channels: selectedChannels,
                    language: selectedLanguage,
                });
                const validatedItems = result.plan.map(item => ({
                    ...item,
                    id: `temp-${Date.now()}-${Math.random()}`,
                    status: 'draft',
                }));
                setCurrentPlan(validatedItems);
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

    const handleSave = async () => {
        if (!currentPlan || !planTitle.trim()) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'Please provide a title for the media plan.' });
            return null;
        }

        let savedPlan: MediaPlan | null = null;
        await startSaving(async () => {
            try {
                const itemsToUpsert = currentPlan.map(item => {
                    const { id, user_channel_settings, ...rest } = item;
                    const payload = {
                        ...rest,
                        id: id.startsWith('temp-') ? undefined : id,
                        media_plan_id: planIdToEdit,
                        user_id: funnel.user_id,
                        offering_id: funnel.offering_id
                    };
                    return payload;
                });
                
                savedPlan = await saveMediaPlan({
                    id: planIdToEdit,
                    funnelId: funnel.id,
                    title: planTitle,
                    planItems: itemsToUpsert as any, // Cast because of temp ID
                    startDate: dateRange?.from?.toISOString() ?? null,
                    endDate: dateRange?.to?.toISOString() ?? null
                });

                toast({ title: 'Plan Saved!', description: 'Your changes have been saved.' });
                setPlanIdToEdit(savedPlan.id);

                setCurrentPlan((savedPlan.media_plan_items || []).map(item => ({
                    ...item,
                    id: item.id || `temp-${Date.now()}-${Math.random()}`,
                    stage_name: item.stage_name || '',
                    creative_prompt: item.creative_prompt || '',
                    status: item.status || 'draft',
                } as PlanItemWithStatus)));

                const { data: updatedFunnel } = await getFunnel(funnel.id);
                if (updatedFunnel) {
                    onPlanSaved(updatedFunnel);
                    setFunnel(updatedFunnel);
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
                savedPlan = null;
            }
        });
        return savedPlan;
    };

    const handleArchivePlan = (planId: string) => {
        startArchiving(async () => {
            try {
                await archiveMediaPlan(planId);
                toast({ title: "Plan Archived", description: "The media plan has been moved to the archive." });
                const { data: updatedFunnel } = await getFunnel(funnel.id);
                if (updatedFunnel) {
                    onPlanSaved(updatedFunnel);
                    setFunnel(updatedFunnel);
                }
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Archive Failed',
                    description: error.message,
                });
            }
        });
    };
    
    const handleClonePlan = (plan: MediaPlan) => {
        const clonedItems = (plan.media_plan_items || []).map(item => ({
            ...item,
            id: `temp-${Date.now()}-${Math.random()}`,
            status: 'draft',
        }));
        
        setCurrentPlan(clonedItems as PlanItemWithStatus[]);
        setPlanTitle(`${plan.title} (Copy)`);
        setPlanIdToEdit(null); // It's a new plan
        
        const newStartDate = new Date();
        const oldStartDate = plan.campaign_start_date ? parseISO(plan.campaign_start_date) : new Date();
        const oldEndDate = plan.campaign_end_date ? parseISO(plan.campaign_end_date) : new Date();
        const duration = oldEndDate.getTime() - oldStartDate.getTime();
        const newEndDate = new Date(newStartDate.getTime() + duration);
        
        setDateRange({ from: newStartDate, to: newEndDate });
        
        const channelsInPlan = plan.media_plan_items?.map((i: any) => i.user_channel_settings?.channel_name).filter(Boolean).filter((v: any, i: any, a: any) => a.indexOf(v) === i) || [];
        setSelectedChannels(channelsInPlan);
        
        setView('generate');
        toast({ title: 'Plan Cloned!', description: 'A copy of the plan has been created. Adjust the dates and save.' });
    };


    const handleDeletePlan = (planId: string) => {
        startDeleting(async () => {
            try {
                await deleteMediaPlan(planId);
                toast({ title: "Plan Deleted", description: "The media plan has been successfully deleted." });
                const { data: updatedFunnel } = await getFunnel(funnel.id);
                if (updatedFunnel) {
                    onPlanSaved(updatedFunnel);
                    setFunnel(updatedFunnel);
                }
                setView('list');
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    };
    
    const handleRegenerateItem = async (itemToRegen: PlanItemWithStatus) => {
        setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true }));
        try {
            const newItem = await regeneratePlanItem({ 
                funnelId: funnel.id, 
                channel: itemToRegen.user_channel_settings!.channel_name, 
                stageName: itemToRegen.stage_name,
            });
            
            setCurrentPlan(prev => prev!.map(item => item.id === itemToRegen.id ? { ...item, ...newItem, status: 'draft' } : item));
            toast({ title: 'Item Regenerated!', description: 'The content idea has been updated.'});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Regeneration Failed', description: error.message });
        } finally {
            setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: false }));
        }
    };

    const handleBulkApproveChannel = async () => {
        if (!currentPlan || !activeTab) return;

        let finalPlan = currentPlan;
        let finalPlanId = planIdToEdit;
        
        const isUnsaved = finalPlan.some(item => item.id.startsWith('temp-'));
        if (!finalPlanId || isUnsaved) {
            toast({ title: 'Saving plan before approval...', description: 'This will only take a moment.' });
            const savedPlan = await handleSave();
            if (!savedPlan || !savedPlan.media_plan_items) {
                toast({ variant: 'destructive', title: 'Save failed', description: 'Cannot approve an unsaved plan.' });
                return;
            }
            finalPlan = savedPlan.media_plan_items.map(item => ({...item, id: item.id.toString()}));
            finalPlanId = savedPlan.id;
        }

        const itemsForChannel = finalPlan.filter(item => item.user_channel_settings?.channel_name === activeTab);
        const itemIds = itemsForChannel.map(item => item.id);
        
        if (itemIds.length === 0) {
            toast({ title: 'No items to approve', description: `There are no items for the ${activeTab} channel.` });
            return;
        }

        startSaving(async () => {
            try {
                const { count } = await addMultipleToArtisanQueue(funnel.id, funnel.offering_id, itemIds);
                
                toast({ title: isCurrentChannelApproved ? 'Plan Updated!' : 'Plan Approved!', description: `${count} item(s) for ${activeTab} have been added/updated in the Artisan Queue.` });
                
                setCurrentPlan(prevPlan => prevPlan!.map(item => 
                    itemIds.includes(item.id) ? { ...item, status: 'approved' } : item
                ));

                const { data: updatedFunnel } = await getFunnel(funnel.id);
                if (updatedFunnel) {
                    onPlanSaved(updatedFunnel);
                    setFunnel(updatedFunnel);
                }

            } catch (error: any) {
                console.error('[Client] Bulk approve error:', error);
                toast({ variant: 'destructive', title: 'Bulk Add Failed', description: error.message });
            }
        });
    }

    const handleItemChange = (itemId: string, field: keyof Omit<PlanItem, 'offering_id'>, value: string) => {
        setCurrentPlan(prev => prev!.map(item => {
            if (item.id === itemId) {
                if (field === 'suggested_post_at') {
                    const existingDate = item.suggested_post_at ? parseISO(item.suggested_post_at) : new Date();
                    let newDate;
                    if (value.includes('T')) {
                         newDate = parseISO(value);
                    } else {
                        const [hours, minutes] = value.split(':').map(Number);
                        newDate = setHours(setMinutes(existingDate, minutes), hours);
                    }
                    return { ...item, suggested_post_at: newDate.toISOString(), status: 'draft' };
                }
                return { ...item, [field]: value, status: 'draft' };
            }
            return item;
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setCurrentPlan(prev => prev!.filter(item => item.id !== itemId));
    };

    const handleAddNewItem = (channel: string) => {
        const newItem: PlanItemWithStatus = {
            id: `temp-${Date.now()}-${Math.random()}`,
            offering_id: funnel.offering_id || '',
            user_channel_settings: { channel_name: channel },
            format: getFormatsForChannel(channel)[0] || 'Blog Post',
            copy: '',
            hashtags: '',
            creative_prompt: '',
            stage_name: 'New Stage',
            objective: 'Your new objective here',
            concept: 'Your new concept here',
            suggested_post_at: new Date().toISOString(),
            status: 'draft',
        };
        setCurrentPlan(prev => [...(prev || []), newItem]);
    };
    
    const handleChannelToggle = (channel: string) => {
        setSelectedChannels(prev =>
            prev.includes(channel)
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        );
    }

    const renderListView = () => {
        const plans = (funnel.media_plans || []).filter(plan => (plan.status || 'active') === planStatusFilter);

        return (
             <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                 <div className="flex justify-between items-center">
                    <Tabs value={planStatusFilter} onValueChange={(value) => setPlanStatusFilter(value as 'active' | 'archived')} className="w-full">
                        <TabsList>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="archived">Archived</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button onClick={() => setView('generate')} className="flex-shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Media Plan
                    </Button>
                 </div>
                
                {plans.length > 0 ? (
                    plans.map(plan => {
                        const allItems = plan.media_plan_items || [];
                        const uniqueChannels = [...new Set(allItems.map(item => item.user_channel_settings?.channel_name).filter(Boolean))];
                        const totalChannels = uniqueChannels.length;
                        
                        const approvedChannelsCount = uniqueChannels.reduce((count, channel) => {
                            const channelItems = allItems.filter(item => item.user_channel_settings?.channel_name === channel);
                            const areAllApproved = channelItems.length > 0 && channelItems.every(item => item.status === 'approved');
                            return areAllApproved ? count + 1 : count;
                        }, 0);
                        
                        const isFinished = plan.campaign_end_date && isPast(parseISO(plan.campaign_end_date));

                        return (
                            <Card key={plan.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{plan.title}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {isFinished && <Badge variant="secondary">Finished</Badge>}
                                            {totalChannels > 0 && (
                                                <Badge className={approvedChannelsCount === totalChannels ? "bg-green-100 text-green-800 hover:bg-green-100/80" : "bg-blue-100 text-blue-800 hover:bg-blue-100/80"}>
                                                    {approvedChannelsCount}/{totalChannels} Approved
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardDescription>Created on {plan.created_at ? format(parseISO(plan.created_at), 'PPP') : 'N/A'}</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex justify-end gap-2">
                                     {plan.status === 'archived' ? (
                                        <Button size="sm" onClick={() => handleClonePlan(plan)}>
                                            <Copy className="mr-2 h-4 w-4" /> Clone Plan
                                        </Button>
                                    ) : isFinished ? (
                                        <Button variant="outline" size="sm" onClick={() => handleArchivePlan(plan.id)} disabled={isArchiving}>
                                            <Archive className="mr-2 h-4 w-4" /> {isArchiving ? 'Archiving...' : 'Archive'}
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            const itemsWithStatus = (plan.media_plan_items || []).map((item: any) => ({ ...item, id: item.id || `temp-${Date.now()}-${Math.random()}`, stage_name: item.stage_name || '', creative_prompt: item.creative_prompt || '', status: item.status || 'draft' }));
                                            setCurrentPlan(itemsWithStatus);
                                            setPlanTitle(plan.title);
                                            setPlanIdToEdit(plan.id);
                                            setDateRange({ from: plan.campaign_start_date ? parseISO(plan.campaign_start_date) : undefined, to: plan.campaign_end_date ? parseISO(plan.campaign_end_date) : undefined });
                                            const channelsInPlan = plan.media_plan_items?.map((i: any) => i.user_channel_settings?.channel_name).filter(Boolean).filter((v: any, i: any, a: any) => a.indexOf(v) === i) || [];
                                            setSelectedChannels(channelsInPlan);
                                            setView('generate');
                                        }}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the media plan titled "{plan.title}". This action cannot be undone.</AlertDialogDescription>
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
                        )
                    })
                ) : (
                    <p className="text-muted-foreground text-center py-4">No {planStatusFilter} media plans created for this strategy yet.</p>
                )}
            </div>
        );
    };
    
    const renderGenerateView = () => (
        <div className="max-h-[70vh] flex flex-col">
            <div className="flex-shrink-0">
                <Button variant="ghost" onClick={() => { setView('list'); setCurrentPlan(null); setPlanIdToEdit(null); }} className="self-start mb-4"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
            </div>
            
            {isGenerating && <div className="space-y-4 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}

            {!isGenerating && !currentPlan && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Stars className="h-12 w-12 mb-4 text-muted-foreground" />
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
                                <Button id="dates" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="language-select">Campaign Language</Label>
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger id="language-select"><SelectValue placeholder="Select a language" /></SelectTrigger>
                                <SelectContent>{languageList.map((lang) => (<SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Target Channels</Label>
                            <div className="grid grid-cols-2 gap-2 p-4 border rounded-md">
                                {availableChannels.map(c => (<div key={c} className="flex items-center space-x-2"><Checkbox id={`c-${c}`} checked={selectedChannels.includes(c)} onCheckedChange={() => handleChannelToggle(c)} /><Label htmlFor={`c-${c}`} className="capitalize cursor-pointer">{c.replace(/_/g, ' ')}</Label></div>))}
                            </div>
                            {availableChannels.length === 0 && <p className="text-muted-foreground text-center text-sm">No channels enabled. Go to Accounts to enable them.</p>}
                        </div>
                    </div>
                    <Button className="mt-2" onClick={handleGeneratePlan} disabled={isGenerating || !dateRange?.from || !dateRange?.to || !planTitle.trim() || selectedChannels.length === 0}>
                        {isGenerating ? 'Generating...' : 'Generate Media Plan'}
                    </Button>
                </div>
            )}
            
            {currentPlan && (
                 <div className="flex-1 flex flex-col overflow-hidden py-4">
                    <div className="flex-shrink-0 flex justify-between items-center mb-4">
                         <Input id="plan-title" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} className="text-xl font-bold" />
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                        <div className="flex-shrink-0 flex justify-center">
                            <TabsList>
                                {channelsForTabs.map(c => {
                                    const channelItems = groupedByChannel[c] || [];
                                    const isApproved = channelItems.length > 0 && channelItems.every(item => item.status === 'approved');
                                    return (
                                        <TabsTrigger key={c} value={c} className="capitalize flex items-center gap-2">
                                            {isApproved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                            {c.replace(/_/g, ' ')}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>
                        <div className="flex-1 overflow-y-auto mt-4 pr-4">
                            {channelsForTabs.map(c => (
                                <TabsContent key={c} value={c} className="mt-0">
                                    <div className="space-y-4">{groupedByChannel[c]?.map((item) => {
                                        const postDate = item.suggested_post_at ? parseISO(item.suggested_post_at) : null;
                                        const timeValue = postDate && isValid(postDate) ? format(postDate, "HH:mm") : "";
                                        return (
                                        <div key={item.id} className="p-4 border rounded-lg space-y-4 relative transition-all">
                                            <div className="absolute top-2 right-2 flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRegenerateItem(item)} disabled={isRegenerating[item.id]}><RefreshCw className={`h-4 w-4 ${isRegenerating[item.id] ? 'animate-spin' : ''}`} /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`stage_name-${item.id}`}>Strategy Stage</Label>
                                                    <Input id={`stage_name-${item.id}`} value={item.stage_name || ''} onChange={(e) => handleItemChange(item.id, 'stage_name', e.target.value)} className="font-semibold bg-muted/50" />
                                                </div>
                                                <div className="space-y-1"><Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label><Input id={`objective-${item.id}`} value={item.objective || ''} onChange={(e) => handleItemChange(item.id, 'objective', e.target.value)} placeholder="e.g., Build social proof"/></div>
                                                <div className="space-y-1"><Label htmlFor={`concept-${item.id}`}>Concept</Label><Textarea id={`concept-${item.id}`} value={item.concept || ''} onChange={(e) => handleItemChange(item.id, 'concept', e.target.value)} rows={2}/></div>
                                                <div className="space-y-1"><Label htmlFor={`format-${item.id}`}>Format</Label><Select value={item.format} onValueChange={(v) => handleItemChange(item.id, 'format', v)}><SelectTrigger id={`format-${item.id}`} className="font-semibold"><SelectValue placeholder="Select a format" /></SelectTrigger><SelectContent>{mediaFormatConfig.map(g => { const channelFormats = g.formats.filter(f => f.channels.includes(item.user_channel_settings?.channel_name?.toLowerCase() || '')); if (channelFormats.length === 0) return null; return (<SelectGroup key={g.label}><SelectLabel>{g.label}</SelectLabel>{channelFormats.map(f => (<SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>))}</SelectGroup>) })}</SelectContent></Select></div>
                                                <div className="space-y-1"><Label htmlFor={`hashtags-${item.id}`}>Hashtags / Keywords</Label><Input id={`hashtags-${item.id}`} value={item.hashtags} onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)} /></div>
                                                <div className="space-y-1"><Label htmlFor={`copy-${item.id}`}>Copy</Label><Textarea id={`copy-${item.id}`} value={item.copy} onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)} className="text-sm" rows={4} /></div>
                                                <div className="space-y-1"><Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label><Textarea id={`prompt-${item.id}`} value={item.creative_prompt} onChange={(e) => handleItemChange(item.id, 'creative_prompt', e.target.value)} className="text-sm font-mono" rows={3} /></div>
                                                <div className="space-y-2">
                                                    <Label>Suggested Post Time</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                            <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !postDate && "text-muted-foreground")}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {postDate && isValid(postDate) ? format(postDate, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                            <Calendar mode="single" selected={postDate && isValid(postDate) ? postDate : undefined} onSelect={(date) => handleItemChange(item.id, 'suggested_post_at', date?.toISOString() || '')} initialFocus />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Input type="time" value={timeValue} onChange={(e) => handleItemChange(item.id, 'suggested_post_at', e.target.value)} className="w-[120px]"/>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        )
                                    })}</div>
                                    <div className="flex justify-center mt-6"><Button variant="outline" onClick={() => handleAddNewItem(c)}><PlusCircle className="mr-2 h-4 w-4" />Add New Idea to this Channel</Button></div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                </div>
            )}
        </div>
    );
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                <DialogHeader>
                     <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Orchestrate Media Plan</DialogTitle>
                     <DialogDescription>Generate, edit, and approve the tactical content pieces for the '{funnel.name}' strategy.</DialogDescription>
                </DialogHeader>
                
                {view === 'list' ? renderListView() : renderGenerateView()}

                <DialogFooter className="mt-4 pt-4 border-t">
                    {view === 'generate' && currentPlan && (
                        <>
                            <Button onClick={handleSave} disabled={isSaving || isGenerating}>
                                {isSaving ? 'Saving...' : 'Save Plan'}
                            </Button>
                            <Button
                                onClick={handleBulkApproveChannel}
                                disabled={isSaving || isGenerating || !activeTab}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Check className="mr-2 h-4 w-4" />
                                {isCurrentChannelApproved ? `Update '${activeTab}' Plan` : `Approve '${activeTab}' Plan`}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
