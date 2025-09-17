
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
import { generateMediaPlan as generateMediaPlanAction, saveMediaPlan, updateMediaPlan, type MediaPlan } from '../actions';
import type { GenerateMediaPlanOutput } from '@/ai/flows/generate-media-plan-flow';
import { Funnel } from '@/app/funnels/actions';
import { Bot, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PlanItem = GenerateMediaPlanOutput['plan'][0] & { id: string };

interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    strategies: Funnel[];
    planToEdit: MediaPlan | null;
    onPlanSaved: () => void;
}

export function OrchestrateMediaPlanDialog({ isOpen, onOpenChange, strategies, planToEdit, onPlanSaved }: OrchestrateMediaPlanDialogProps) {
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [planItems, setPlanItems] = useState<PlanItem[]>([]);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
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

    const handleGeneratePlan = () => {
        if (!selectedStrategyId) {
            toast({ variant: 'destructive', title: 'No Strategy Selected', description: 'Please select a strategy to generate a plan for.' });
            return;
        }
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({ funnelId: selectedStrategyId });
                const itemsWithIds = result.plan.map(item => ({
                    ...item,
                    id: crypto.randomUUID()
                }));
                setPlanItems(itemsWithIds);
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
    
    const handleItemChange = (itemId: string, field: 'format' | 'copy' | 'hashtags' | 'creativePrompt', value: string) => {
        setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }

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
        }, {} as Record<string, PlanItem[]>);
    }, [planItems]);

    const channels = Object.keys(groupedByChannel);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Orchestrate Media Plan
                    </DialogTitle>
                    <DialogDescription>
                        Generate a tactical media plan from one of your saved strategies.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                     <Label htmlFor="strategy-select">Select a Strategy</Label>
                    <div className="flex gap-4">
                        <Select 
                            onValueChange={setSelectedStrategyId} 
                            defaultValue={planToEdit?.funnel_id ?? undefined}
                            disabled={!!planToEdit || isGenerating}
                        >
                            <SelectTrigger id="strategy-select" className="flex-1">
                                <SelectValue placeholder="Choose a strategy to orchestrate..." />
                            </SelectTrigger>
                            <SelectContent>
                                {strategies.map(strategy => (
                                    <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                        <div className="space-y-4">
                                            {groupedByChannel[channel].map((item) => (
                                                <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`format-${item.id}`}>Format</Label>
                                                            <Input
                                                                id={`format-${item.id}`}
                                                                value={item.format}
                                                                onChange={(e) => handleItemChange(item.id, 'format', e.target.value)}
                                                                className="font-semibold"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label htmlFor={`hashtags-${item.id}`}>Hashtags</Label>
                                                            <Input
                                                                id={`hashtags-${item.id}`}
                                                                value={item.hashtags}
                                                                onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor={`copy-${item.id}`}>Copy</Label>
                                                        <Textarea
                                                            id={`copy-${item.id}`}
                                                            value={item.copy}
                                                            onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)}
                                                            className="text-sm text-muted-foreground"
                                                            rows={4}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label>
                                                        <Textarea
                                                            id={`prompt-${item.id}`}
                                                            value={item.creativePrompt}
                                                            onChange={(e) => handleItemChange(item.id, 'creativePrompt', e.target.value)}
                                                            className="text-sm text-muted-foreground font-mono"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
