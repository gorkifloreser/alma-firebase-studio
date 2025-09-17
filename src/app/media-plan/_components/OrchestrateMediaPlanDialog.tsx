
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
import { generateMediaPlan, saveMediaPlan, updateMediaPlan, type MediaPlan } from '../actions';
import type { GenerateMediaPlanOutput } from '@/ai/flows/generate-media-plan-flow';
import { Funnel } from '@/app/funnels/actions';
import { Bot, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PlanItem = GenerateMediaPlanOutput['plan'][0] & { id: string };

interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    strategy: Funnel;
    planToEdit: MediaPlan | null;
    onPlanSaved: () => void;
}

export function OrchestrateMediaPlanDialog({ isOpen, onOpenChange, strategy, planToEdit, onPlanSaved }: OrchestrateMediaPlanDialogProps) {
    const [planItems, setPlanItems] = useState<PlanItem[]>([]);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && strategy) {
            if (planToEdit) {
                const itemsWithIds = planToEdit.plan_items.map(item => ({
                    ...item,
                    id: crypto.randomUUID()
                }));
                setPlanItems(itemsWithIds);
            } else {
                handleGeneratePlan();
            }
        } else {
            setPlanItems([]);
        }
    }, [isOpen, strategy, planToEdit]);

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            try {
                const result = await generateMediaPlan({ funnelId: strategy.id });
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
    
    const handleItemChange = (itemId: string, field: 'format' | 'description', value: string) => {
        setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }

    const handleSavePlan = async () => {
        startSaving(async () => {
            try {
                const itemsToSave = planItems.map(({ id, ...rest }) => rest);
                if (planToEdit) {
                    await updateMediaPlan(planToEdit.id, itemsToSave);
                } else {
                    await saveMediaPlan(strategy.id, itemsToSave);
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
            if (!acc[item.channel]) {
                acc[item.channel] = [];
            }
            acc[item.channel].push(item);
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
                        For strategy: <span className="font-semibold">{strategy?.name}</span>. Review, edit, and save the AI-generated content plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] flex flex-col">
                    {isGenerating ? (
                        <div className="space-y-4 p-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : planItems.length > 0 ? (
                        <Tabs defaultValue={channels[0]} className="w-full flex-1 flex flex-col">
                            <div className="flex justify-center">
                                <TabsList>
                                    {channels.map(channel => (
                                        <TabsTrigger key={channel} value={channel}>{channel}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                            <div className="flex-1 overflow-y-auto mt-4 pr-6">
                                {channels.map(channel => (
                                    <TabsContent key={channel} value={channel}>
                                        <div className="space-y-4">
                                            {groupedByChannel[channel].map((item, index) => (
                                                <div key={item.id} className="p-4 border rounded-lg space-y-2">
                                                    <Label htmlFor={`format-${index}`}>{channel}</Label>
                                                    <Input
                                                        id={`format-${index}`}
                                                        value={item.format}
                                                        onChange={(e) => handleItemChange(item.id, 'format', e.target.value)}
                                                        className="font-semibold"
                                                    />
                                                    <Textarea
                                                        id={`description-${index}`}
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                        className="text-sm text-muted-foreground"
                                                        rows={2}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    ) : (
                         <div className="text-center text-muted-foreground py-10 flex-1 flex items-center justify-center">
                            No content ideas generated. You can try generating again.
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                     {!planToEdit && (
                        <Button variant="ghost" onClick={handleGeneratePlan} disabled={isGenerating}>
                            <Bot className="mr-2 h-4 w-4" /> Regenerate
                        </Button>
                    )}
                    <Button onClick={handleSavePlan} disabled={isSaving || isGenerating || planItems.length === 0}>
                        {isSaving ? 'Saving...' : 'Save Plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
