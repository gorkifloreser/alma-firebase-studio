
'use client';

import React, { useState, useTransition, useEffect } from 'react';
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
import { Bot, Sparkles, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
                 // If editing, load existing plan items
                const itemsWithIds = planToEdit.plan_items.map(item => ({
                    ...item,
                    id: crypto.randomUUID()
                }));
                setPlanItems(itemsWithIds);
            } else {
                 // If creating, generate a new plan
                handleGeneratePlan();
            }
        } else {
            setPlanItems([]); // Reset when closing
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
                if (planToEdit) {
                    await updateMediaPlan(planToEdit.id, planItems);
                } else {
                    await saveMediaPlan(strategy.id, planItems);
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Orchestrate Media Plan
                    </DialogTitle>
                    <DialogDescription>
                        For strategy: <span className="font-semibold">{strategy?.name}</span>. Review, edit, and save the AI-generated content plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-6 py-4">
                    {isGenerating ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : planItems.length > 0 ? (
                        <div className="space-y-4">
                            {planItems.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-lg space-y-2">
                                    <Label htmlFor={`format-${index}`}>{item.channel}</Label>
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
                    ) : (
                         <div className="text-center text-muted-foreground py-10">
                            No content ideas generated. You can try generating again.
                        </div>
                    )}
                </div>

                <DialogFooter>
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
