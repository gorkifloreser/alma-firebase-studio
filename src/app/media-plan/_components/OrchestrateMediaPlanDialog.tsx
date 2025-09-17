
'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateMediaPlan as generateMediaPlanAction, regeneratePlanItem, saveMediaPlan, updateMediaPlan, type MediaPlan, type PlanItem } from '../actions';
import { Funnel } from '@/app/funnels/actions';
import { Bot, Sparkles, RefreshCw, Trash2, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

type PlanItemWithId = PlanItem & { id: string };
type RegeneratingState = { [itemId: string]: boolean };

interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    strategies: Funnel[];
    planToEdit: MediaPlan | null;
    onPlanSaved: () => void;
}

const mediaFormatConfig = [
    {
        label: "Image",
        formats: [
            { value: '1:1 Square Image', channels: ['instagram', 'facebook'] },
            { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] },
            { value: '9:16 Story Image', channels: ['instagram', 'facebook'] },
        ]
    },
    {
        label: "Video",
        formats: [
             { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] },
             { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] },
             { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] },
        ]
    },
    {
        label: "Text & Communication",
        formats: [
            { value: 'Text Post', channels: ['facebook', 'linkedin'] },
            { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] },
            { value: 'Newsletter', channels: ['webmail'] },
            { value: 'Promotional Email', channels: ['webmail'] },
            { value: 'Blog Post', channels: ['website'] },
            { value: 'Text Message', channels: ['whatsapp', 'telegram'] },
        ]
    }
];

const getFormatsForChannel = (channel: string): string[] => {
    const channelLower = channel.toLowerCase();
    return mediaFormatConfig.flatMap(category => 
        category.formats
            .filter(format => format.channels.includes(channelLower))
            .map(format => format.value)
    );
};


export function OrchestrateMediaPlanDialog({ isOpen, onOpenChange, strategies, planToEdit, onPlanSaved }: OrchestrateMediaPlanDialogProps) {
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [planItems, setPlanItems] = useState<PlanItemWithId[]>([]);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isRegenerating, setIsRegenerating] = useState<RegeneratingState>({});
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (planToEdit) {
                 const itemsWithIds = planToEdit.plan_items.map(item => ({
                    ...item,
                    id: crypto.randomUUID()
                }));
                setPlanItems(itemsWithIds);
                setSelectedStrategyId(planToEdit.funnel_id);
            } else {
                // Reset for new plan creation
                setPlanItems([]);
                setSelectedStrategyId(null);
            }
        }
    }, [isOpen, planToEdit]);
    
    const validateAndSetPlanItems = (items: PlanItem[]) => {
        const validatedItems = items.map(item => {
            const validFormats = getFormatsForChannel(item.channel);
            const formatIsValid = validFormats.includes(item.format);
            return {
                ...item,
                format: formatIsValid ? item.format : (validFormats[0] || 'Text Post'),
                id: crypto.randomUUID(),
            };
        });
        setPlanItems(validatedItems);
    };

    const handleGeneratePlan = () => {
        if (!selectedStrategyId) {
            toast({ variant: 'destructive', title: 'No Strategy Selected', description: 'Please select a strategy to generate a plan for.' });
            return;
        }
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({ funnelId: selectedStrategyId });
                validateAndSetPlanItems(result.plan);
                toast({
                    title: 'Media Plan Generated!',
                    description: 'Review and edit the suggested content ideas below.'
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Generation Failed',
                    description: error.message,
                });
            }
        });
    };

    const handleRegenerateItem = async (itemToRegen: PlanItemWithId) => {
        if (!selectedStrategyId || !itemToRegen.conceptualStep) return;

        setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true }));
        try {
            const newItem = await regeneratePlanItem({
                funnelId: selectedStrategyId,
                channel: itemToRegen.channel,
                conceptualStep: itemToRegen.conceptualStep
            });
            
            const validFormats = getFormatsForChannel(newItem.channel);
            const formatIsValid = validFormats.includes(newItem.format);

            setPlanItems(prev => prev.map(item => 
                item.id === itemToRegen.id 
                ? { ...newItem, id: itemToRegen.id, format: formatIsValid ? newItem.format : (validFormats[0] || 'Text Post') } 
                : item
            ));
             toast({
                title: 'Item Regenerated!',
                description: 'The content idea has been updated.'
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Regeneration Failed',
                description: error.message,
            });
        } finally {
            setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: false }));
        }
    }
    
    const handleItemChange = (itemId: string, field: 'format' | 'copy' | 'hashtags' | 'creativePrompt', value: string) => {
        setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }

    const handleConceptualStepObjectiveChange = (itemId: string, value: string) => {
        setPlanItems(prev => prev.map(item => {
            if (item.id === itemId && item.conceptualStep) {
                return {
                    ...item,
                    conceptualStep: {
                        ...item.conceptualStep,
                        objective: value
                    }
                };
            }
            return item;
        }));
    };
    
    const handleRemoveItem = (itemId: string) => {
        setPlanItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddNewItem = (channel: string, stageName: string) => {
        const strategy = strategies.find(s => s.id === selectedStrategyId);
        const validFormats = getFormatsForChannel(channel);
        const newItem: PlanItemWithId = {
            id: crypto.randomUUID(),
            offeringId: strategy?.offering_id || '',
            channel: channel,
            format: validFormats[0] || 'Text Post',
            copy: '',
            hashtags: '',
            creativePrompt: '',
            conceptualStep: {
                objective: 'Your new objective here',
                stageName: stageName,
            },
        };
        setPlanItems(prev => [...prev, newItem]);
    };

    const handleSavePlan = async () => {
        if (!selectedStrategyId) return;
        startSaving(async () => {
            try {
                const itemsToSave = planItems.map(({ id, ...rest }) => rest);
                if (planToEdit) {
                    await updateMediaPlan(planToEdit.id, itemsToSave);
                } else {
                    await saveMediaPlan(selectedStrategyId, itemsToSave);
                }
                toast({
                    title: 'Success!',
                    description: `Media plan has been ${planToEdit ? 'updated' : 'saved'}.`
                });
                onPlanSaved();
            } catch (error: any)
            {
                 toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: error.message,
                });
            }
        });
    }

    const groupedByChannel = useMemo(() => {
        return planItems.reduce((acc, item) => {
            const channelKey = item.channel || 'General';
            if (!acc[channelKey]) {
                acc[channelKey] = [];
            }
            acc[channelKey].push(item);
            return acc;
        }, {} as Record<string, PlanItemWithId[]>);
    }, [planItems]);
    
    const groupedByChannelAndStage = useMemo(() => {
        const result: Record<string, Record<string, PlanItemWithId[]>> = {};
        for (const channel in groupedByChannel) {
            result[channel] = groupedByChannel[channel].reduce((acc, item) => {
                const stageName = item.conceptualStep?.stageName || 'Uncategorized';
                if (!acc[stageName]) {
                    acc[stageName] = [];
                }
                acc[stageName].push(item);
                return acc;
            }, {} as Record<string, PlanItemWithId[]>);
        }
        return result;
    }, [groupedByChannel]);

    const channels = Object.keys(groupedByChannel);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        {planToEdit ? 'Edit Media Plan' : 'Orchestrate Media Plan'}
                    </DialogTitle>
                    <DialogDescription>
                        {planToEdit ? 'Edit the details of your saved media plan.' : 'Generate a tactical media plan from one of your saved strategies.'}
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="strategy-select">Strategy</Label>
                            <Select 
                                onValueChange={setSelectedStrategyId} 
                                defaultValue={planToEdit?.funnel_id ?? undefined}
                                disabled={!!planToEdit || isGenerating}
                            >
                                <SelectTrigger id="strategy-select">
                                    <SelectValue placeholder="Choose a strategy to orchestrate..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {strategies.map(strategy => (
                                        <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {!planToEdit && (
                             <Button onClick={handleGeneratePlan} disabled={isGenerating || !selectedStrategyId}>
                                <Bot className="mr-2 h-4 w-4" /> 
                                {isGenerating ? 'Generating...' : 'Generate Plan'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="max-h-[60vh] flex flex-col overflow-hidden">
                    {isGenerating ? (
                        <div className="space-y-4 p-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : planItems.length > 0 ? (
                        <Tabs defaultValue={channels[0]} className="w-full flex-1 flex flex-col min-h-0">
                            <div className="flex justify-center">
                                <TabsList>
                                    {channels.map(channel => (
                                        <TabsTrigger key={channel} value={channel} className="capitalize">{channel.replace(/_/g, ' ')}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                            <div className="flex-1 overflow-y-auto mt-4 pr-4">
                                {channels.map(channel => (
                                    <TabsContent key={channel} value={channel} className="mt-0">
                                         {Object.entries(groupedByChannelAndStage[channel] || {}).map(([stageName, items]) => (
                                            <div key={stageName} className="mb-6">
                                                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{stageName}</h3>
                                                <div className="space-y-4">
                                                    {items.map((item) => (
                                                        <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                                                            <div className="absolute top-2 right-2 flex items-center gap-2">
                                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRegenerateItem(item)} disabled={isRegenerating[item.id]}>
                                                                    <RefreshCw className={`h-4 w-4 ${isRegenerating[item.id] ? 'animate-spin' : ''}`} />
                                                                </Button>
                                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>

                                                            <div className="space-y-1 pr-24">
                                                                <Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label>
                                                                <Input 
                                                                    id={`objective-${item.id}`}
                                                                    value={item.conceptualStep?.objective || ''}
                                                                    onChange={(e) => handleConceptualStepObjectiveChange(item.id, e.target.value)}
                                                                    placeholder="e.g., Build social proof by showcasing success"
                                                                />
                                                            </div>
                                                            
                                                            <div className="space-y-1">
                                                                <Label htmlFor={`format-${item.id}`}>Format</Label>
                                                                <Select
                                                                    value={item.format}
                                                                    onValueChange={(value) => handleItemChange(item.id, 'format', value)}
                                                                >
                                                                    <SelectTrigger id={`format-${item.id}`} className="font-semibold">
                                                                        <SelectValue placeholder="Select a format" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {mediaFormatConfig.map(group => {
                                                                            const channelFormats = group.formats.filter(f => f.channels.includes(item.channel.toLowerCase()));
                                                                            if (channelFormats.length === 0) return null;
                                                                            return (
                                                                                <SelectGroup key={group.label}>
                                                                                    <SelectLabel>{group.label}</SelectLabel>
                                                                                    {channelFormats.map(format => (
                                                                                        <SelectItem key={format.value} value={format.value}>{format.value}</SelectItem>
                                                                                    ))}
                                                                                </SelectGroup>
                                                                            )
                                                                        })}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <Label htmlFor={`hashtags-${item.id}`}>Hashtags / Keywords</Label>
                                                                <Input
                                                                    id={`hashtags-${item.id}`}
                                                                    value={item.hashtags}
                                                                    onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="space-y-1">
                                                                <Label htmlFor={`copy-${item.id}`}>Copy</Label>
                                                                <Textarea
                                                                    id={`copy-${item.id}`}
                                                                    value={item.copy}
                                                                    onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)}
                                                                    className="text-sm"
                                                                    rows={4}
                                                                />
                                                            </div>

                                                            <div className="space-y-1">
                                                                <Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label>
                                                                <Textarea
                                                                    id={`prompt-${item.id}`}
                                                                    value={item.creativePrompt}
                                                                    onChange={(e) => handleItemChange(item.id, 'creativePrompt', e.target.value)}
                                                                    className="text-sm font-mono"
                                                                    rows={3}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                 <div className="flex justify-center mt-6">
                                                    <Button variant="outline" onClick={() => handleAddNewItem(channel, stageName)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add New Idea to this Stage
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    ) : (
                         <div className="text-center text-muted-foreground py-10 flex-1 flex items-center justify-center">
                           {selectedStrategyId ? 'Click "Generate Plan" to begin.' : 'Please select a strategy first.'}
                        </div>
                    )}
                </div>


                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSavePlan} disabled={isSaving || isGenerating || planItems.length === 0}>
                        {isSaving ? 'Saving...' : 'Save Plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
