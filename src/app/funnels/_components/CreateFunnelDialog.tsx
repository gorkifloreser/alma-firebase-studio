

'use client';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFunnel, generateFunnelPreview, FunnelPreset, updateFunnel, Funnel } from '../actions';
import { getOfferings, Offering } from '@/app/offerings/actions';
import { Bot, User, Stars, Sparkles, ArrowLeft, PlusCircle, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput, ConceptualStep } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnelPresets: FunnelPreset[];
    onFunnelSaved: () => void;
    funnelToEdit: Funnel | null;
}

type EditableStrategy = {
    campaignSuccessMetrics: string[];
    strategy: Array<{
        stageName: string;
        objective: string;
        keyMessage: string;
        conceptualSteps: Array<ConceptualStep>;
        successMetrics: string[];
    }>
};

type UsedContext = {
    offeringTitle: string | null;
    funnelType: string;
    goal: string;
    toneOfVoice: string | null;
    audience: any;
} | null;

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    funnelPresets,
    onFunnelSaved,
    funnelToEdit,
}: CreateFunnelDialogProps) {
    // Step 1 State
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [usedContext, setUsedContext] = useState<UsedContext>(null);
    
    // Step 2 State
    const [generatedContent, setGeneratedContent] = useState<GenerateFunnelOutput | null>(null);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const isEditMode = !!funnelToEdit;
    
    useEffect(() => {
        if (isOpen) {
            getOfferings().then(setOfferings);

            if (funnelToEdit) {
                // Editing an existing funnel
                setSelectedOfferingId(funnelToEdit.offering_id);
                setSelectedPresetId(funnelToEdit.preset_id);
                setGoal(funnelToEdit.goal || '');
                setName(funnelToEdit.name || '');
                setGeneratedContent(funnelToEdit.strategy_brief);
            } else {
                // Reset all state for new funnel
                setSelectedOfferingId(null);
                setSelectedPresetId(null);
                setGeneratedContent(null);
                setName('');
                setGoal('');
                setUsedContext(null);
            }
        }
    }, [isOpen, funnelToEdit]);

    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null && goal.trim() !== '';

    const handleGenerateBlueprint = async () => {
        if (!canGenerate) return;

        startGenerating(async () => {
            try {
                const preset = funnelPresets.find(p => p.id === selectedPresetId);
                const offering = offerings.find(o => o.id === selectedOfferingId);
                if (!preset || !offering) throw new Error("Selected preset or offering not found.");
                
                // Store context for UI verification
                setUsedContext({
                    offeringTitle: offering.title.primary,
                    funnelType: preset.title,
                    goal,
                    toneOfVoice: 'Fetching...',
                    audience: 'Fetching...'
                });

                const result = await generateFunnelPreview({
                    offeringId: selectedOfferingId!,
                    funnelType: preset.title,
                    funnelPrinciples: preset.principles,
                    goal,
                });
                
                setGeneratedContent(result);
                setName(name || `${offering.title.primary}: ${preset.title}`);
                toast({ title: 'Strategy Generated!', description: 'Review and refine the strategy below.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Generation Failed', description: error.message });
                 setUsedContext(null);
            }
        });
    };

    const handleSave = async () => {
        if (!selectedPresetId || !selectedOfferingId || !generatedContent || !name.trim()) return;

        startSaving(async () => {
             try {
                const payload = {
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    name,
                    goal,
                    strategyBrief: generatedContent,
                };

                if (isEditMode && funnelToEdit) {
                    await updateFunnel(funnelToEdit.id, payload);
                } else {
                    await createFunnel(payload);
                }
                
                onFunnelSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Save Failed', description: error.message });
            }
        });
    };

    const handleBlueprintChange = (stageIndex: number, field: keyof EditableStrategy['strategy'][0], value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }
    const handleConceptualStepChange = (stageIndex: number, stepIndex: number, field: keyof ConceptualStep, value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy });}
    
    const handleAddStage = () => { if (!generatedContent) return; const newStage = { stageName: "New Stage", objective: "", keyMessage: "", conceptualSteps: [], successMetrics: [] }; setGeneratedContent({ ...generatedContent, strategy: [...generatedContent.strategy, newStage] }); }
    const handleDeleteStage = (stageIndex: number) => { if (!generatedContent) return; const newStrategy = generatedContent.strategy.filter((_, i) => i !== stageIndex); setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }
    const handleAddStep = (stageIndex: number) => { if (!generatedContent) return; const newStep = { step: (generatedContent.strategy[stageIndex].conceptualSteps.length || 0) + 1, concept: "New conceptual idea", objective: "Objective for this idea" }; const newStrategy = [...generatedContent.strategy]; newStrategy[stageIndex].conceptualSteps.push(newStep); setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }
    const handleDeleteStep = (stageIndex: number, stepIndex: number) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; newStrategy[stageIndex].conceptualSteps = newStrategy[stageIndex].conceptualSteps.filter((_, i) => i !== stepIndex); setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }

    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        {isEditMode ? 'Edit AI Strategy' : 'Create a New AI Strategy'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Refine the details of your strategic plan.' : 'Select a template, define your goal, and generate a strategic plan.'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-6">
                   {!generatedContent ? (
                        <div className="space-y-8">
                            <Accordion type="single" collapsible defaultValue="item-1">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger><Label className="text-lg font-semibold cursor-pointer">1. Choose a Strategy Template</Label></AccordionTrigger>
                                    <AccordionContent className="pt-4">
                                        {customPresets.length > 0 && (<div className="mt-4"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4"/> Your Custom Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{customPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>)}
                                        <div className="mt-6"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><Stars className="h-4 w-4"/> Global Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{globalPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            <div className="space-y-4"><Label htmlFor="offering-select" className="text-lg font-semibold">2. Choose an Offering</Label><Select onValueChange={setSelectedOfferingId} value={selectedOfferingId || undefined}><SelectTrigger id="offering-select" className="text-base py-6"><SelectValue placeholder="Select an offering to promote..." /></SelectTrigger><SelectContent>{offerings.map(o => (<SelectItem key={o.id} value={o.id}>{o.title.primary}</SelectItem>))}</SelectContent></Select></div>
                            <div className="space-y-4"><Label htmlFor="goal" className="text-lg font-semibold">3. Define Your Goal</Label><Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Get 50 signups for my webinar" className="text-base py-6"/></div>
                            <Button onClick={handleGenerateBlueprint} disabled={!canGenerate || isGenerating} className="w-full">{isGenerating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Strategy</>}</Button>
                        </div>
                   ) : (
                        <div className="space-y-6">
                            <Accordion type="single" collapsible className="w-full border rounded-lg px-4">
                                <AccordionItem value="context" className="border-b-0">
                                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            AI Generation Context
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                        <p><strong className="text-foreground">Offering:</strong> {usedContext?.offeringTitle || funnelToEdit?.offerings?.title.primary}</p>
                                        <p><strong className="text-foreground">Goal:</strong> {goal}</p>
                                        <p><strong className="text-foreground">Template:</strong> {usedContext?.funnelType || funnelPresets.find(p=>p.id === funnelToEdit?.preset_id)?.title}</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            <h3 className="text-xl font-semibold border-b pb-2">Edit Strategy</h3>
                            <div className="space-y-2"><Label htmlFor="funnelName" className="text-lg font-semibold">Strategy Title</Label><Input id="funnelName" value={name} onChange={(e) => setName(e.target.value)} className="text-lg"/></div>
                            <div className="space-y-6">{generatedContent.strategy.map((stage, sIdx) => (
                                <Card key={sIdx} className="relative group/stage">
                                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/stage:opacity-100 transition-opacity" onClick={() => handleDeleteStage(sIdx)}><Trash2 className="h-4 w-4" /></Button>
                                    <CardHeader><Input value={stage.stageName} onChange={(e) => handleBlueprintChange(sIdx, 'stageName', e.target.value)} className="text-xl font-bold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"/></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1"><Label>Objective</Label><Textarea value={stage.objective} onChange={(e) => handleBlueprintChange(sIdx, 'objective', e.target.value)} /></div>
                                        <div className="space-y-1"><Label>Key Message</Label><Textarea value={stage.keyMessage} onChange={(e) => handleBlueprintChange(sIdx, 'keyMessage', e.target.value)} /></div>
                                        <div><Label>Conceptual Ideas</Label><div className="space-y-2 mt-1">{stage.conceptualSteps.map((step, stepIdx) => (
                                            <div key={step.step} className="p-3 border rounded-md space-y-2 relative group/step">
                                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/step:opacity-100 transition-opacity" onClick={() => handleDeleteStep(sIdx, stepIdx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                <Textarea value={step.concept} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'concept', e.target.value)} rows={2} className="text-sm font-semibold" placeholder="Concept..."/>
                                                <Textarea value={step.objective} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'objective', e.target.value)} rows={1} className="text-xs" placeholder="Objective..."/>
                                            </div>))}
                                            <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddStep(sIdx)}><PlusCircle className="mr-2 h-4 w-4" /> Add Idea</Button>
                                        </div></div>
                                    </CardContent>
                                </Card>))}
                                <Button variant="secondary" className="w-full" onClick={handleAddStage}><PlusCircle className="mr-2 h-4 w-4" /> Add New Stage</Button>
                            </div>
                        </div>
                   )}
                </div>

                <DialogFooter>
                    {generatedContent && (
                        <Button variant="ghost" onClick={() => setGeneratedContent(null)}><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !generatedContent}>
                        {isSaving ? 'Saving...' : 'Save Strategy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
