

'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { updateFunnel, Funnel } from '../actions';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { GenerateFunnelOutput, ConceptualStep } from '@/ai/flows/generate-funnel-flow';


interface EditStrategyDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnel: Funnel;
    onFunnelUpdated: () => void;
}

type EditableStrategy = {
    name: string;
    goal: string;
    strategyBrief: GenerateFunnelOutput;
}

export function EditStrategyDialog({
    isOpen,
    onOpenChange,
    funnel,
    onFunnelUpdated,
}: EditStrategyDialogProps) {
    
    const [editableData, setEditableData] = useState<EditableStrategy>({
        name: funnel.name,
        goal: funnel.goal || '',
        strategyBrief: funnel.strategy_brief || { campaignSuccessMetrics: [], strategy: [], channels: [] },
    });

    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    
    useEffect(() => {
        if (funnel) {
            setEditableData({
                name: funnel.name,
                goal: funnel.goal || '',
                strategyBrief: funnel.strategy_brief || { campaignSuccessMetrics: [], strategy: [], channels: [] },
            });
        }
    }, [funnel, isOpen]);


    const handleSave = async () => {
        startSaving(async () => {
             try {
                await updateFunnel(funnel.id, {
                    name: editableData.name,
                    goal: editableData.goal,
                    strategyBrief: editableData.strategyBrief,
                });
                onFunnelUpdated();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Strategy Update Failed',
                    description: error.message,
                });
            }
        });
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditableData(prev => ({ ...prev, [name]: value }));
    }
    
    const handleStageChange = (stageIndex: number, field: 'stageName' | 'objective' | 'keyMessage', value: string) => {
        const newStrategy = [...editableData.strategyBrief.strategy];
        (newStrategy[stageIndex] as any)[field] = value;
        setEditableData(prev => ({
            ...prev,
            strategyBrief: {
                ...prev.strategyBrief,
                strategy: newStrategy,
            }
        }));
    }
    
    const handleStepChange = (stageIndex: number, stepIndex: number, field: keyof ConceptualStep, value: string) => {
        const newStrategy = [...editableData.strategyBrief.strategy];
        (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value;
         setEditableData(prev => ({
            ...prev,
            strategyBrief: {
                ...prev.strategyBrief,
                strategy: newStrategy,
            }
        }));
    }


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        Edit Strategy
                    </DialogTitle>
                    <DialogDescription>
                        Refine the high-level strategy for your campaign.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-lg font-semibold">Strategy Title</Label>
                        <Input
                            id="name"
                            name="name"
                            value={editableData.name}
                            onChange={handleTextChange}
                            className="text-lg"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="goal" className="text-lg font-semibold">Strategy Goal</Label>
                        <Input
                            id="goal"
                            name="goal"
                            value={editableData.goal}
                            onChange={handleTextChange}
                        />
                    </div>
                    <div className="space-y-6">
                        {editableData.strategyBrief.strategy.map((stage, stageIndex) => (
                            <Card key={stageIndex}>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-1">
                                        <Label>Stage Name</Label>
                                         <Input 
                                            value={stage.stageName}
                                            onChange={(e) => handleStageChange(stageIndex, 'stageName', e.target.value)}
                                            className="text-xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Objective</Label>
                                        <Textarea value={stage.objective} onChange={(e) => handleStageChange(stageIndex, 'objective', e.target.value)} />
                                    </div>
                                     <div className="space-y-1">
                                        <Label>Key Message</Label>
                                        <Textarea value={stage.keyMessage} onChange={(e) => handleStageChange(stageIndex, 'keyMessage', e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>Conceptual Steps</Label>
                                         <div className="space-y-2 mt-1">
                                            {stage.conceptualSteps.map((step, stepIndex) => (
                                                 <div key={step.step} className="p-2 border rounded-md space-y-1">
                                                     <Textarea
                                                        value={step.objective}
                                                        onChange={(e) => handleStepChange(stageIndex, stepIndex, 'objective', e.target.value)}
                                                        className="font-semibold text-sm"
                                                        rows={1}
                                                    />
                                                    <Textarea
                                                        value={step.concept}
                                                        onChange={(e) => handleStepChange(stageIndex, stepIndex, 'concept', e.target.value)}
                                                        rows={2}
                                                        className="text-sm"
                                                    />
                                                 </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
