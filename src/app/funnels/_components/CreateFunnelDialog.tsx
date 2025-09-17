
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
import { Offering } from '@/app/offerings/actions';
import { Bot, User, Stars, Sparkles, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput, ConceptualStep } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getUserChannels } from '@/app/accounts/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    funnelPresets: FunnelPreset[];
    onFunnelSaved: () => void;
    funnelToEdit?: Funnel | null;
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

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    funnelPresets,
    onFunnelSaved,
    funnelToEdit,
}: CreateFunnelDialogProps) {
    const [step, setStep] = useState<'selection' | 'edit_blueprint'>('selection');
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState('');
    const [availableChannels, setAvailableChannels] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState<EditableStrategy | null>(null);

    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            setStep('selection');
            if (funnelToEdit) {
                // This dialog is now only for editing the blueprint, not creating.
                // So we can directly go to the edit step if a funnel is provided.
                setStep('edit_blueprint');
                setSelectedOfferingId(funnelToEdit.offering_id);
                setSelectedPresetId(funnelToEdit.preset_id);
                setName(funnelToEdit.name);
                setGoal(funnelToEdit.goal || '');
                if (funnelToEdit.strategy_brief) {
                    setGeneratedContent(funnelToEdit.strategy_brief);
                    setSelectedChannels(funnelToEdit.strategy_brief.channels || []);
                }
            } else {
                // Reset state for new funnel
                setSelectedOfferingId(null);
                setSelectedPresetId(null);
                setGeneratedContent(null);
                setName('');
                setGoal('');
            }
            
            // Fetch channels
            getUserChannels().then(channels => {
                setAvailableChannels(channels);
                if (!funnelToEdit) {
                    setSelectedChannels(channels); // Default to all selected
                }
            });
        }
    }, [isOpen, funnelToEdit]);

    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null && goal.trim() !== '' && selectedChannels.length > 0;

    const handleGenerateBlueprint = async () => {
        if (!canGenerate) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a template, an offering, define a goal, and select at least one channel.',
            });
            return;
        };

        startGenerating(async () => {
            try {
                const preset = funnelPresets.find(p => p.id === selectedPresetId);
                const offering = offerings.find(o => o.id === selectedOfferingId);
                if (!preset || !offering) throw new Error("Selected preset or offering not found.");

                const result = await generateFunnelPreview({
                    offeringId: selectedOfferingId!,
                    funnelType: preset.title,
                    funnelPrinciples: preset.principles,
                    goal,
                    channels: selectedChannels,
                });
                
                setGeneratedContent(result);
                if (!funnelToEdit) {
                    setName(`${offering.title.primary}: ${preset.title}`);
                }
                setStep('edit_blueprint');
                toast({
                    title: 'Strategy Blueprint Generated!',
                    description: 'Review and edit the high-level strategy for your campaign.',
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

    const handleSave = async () => {
        if (!selectedPresetId || !selectedOfferingId || !generatedContent || !name.trim()) {
             toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure the strategy has a title and content before saving.'});
            return;
        }

        startSaving(async () => {
             try {
                const payload = {
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    name,
                    goal,
                    strategyBrief: { ...generatedContent, channels: selectedChannels },
                };

                if (funnelToEdit) {
                    await updateFunnel(funnelToEdit.id, payload);
                } else {
                    await createFunnel(payload);
                }
                onFunnelSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Save Failed', description: error.message, });
            }
        });
    }

    const handleChannelToggle = (channel: string) => { setSelectedChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]); }
    const handleBlueprintChange = (stageIndex: number, field: keyof EditableStrategy['strategy'][0], value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }
    const handleConceptualStepChange = (stageIndex: number, stepIndex: number, field: keyof ConceptualStep, value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy });}


    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    const renderSelectionStep = () => (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"> <Sparkles className="text-primary"/>{funnelToEdit ? 'Edit Strategy' : 'Create a New Strategy'}</DialogTitle>
                <DialogDescription>Select a template, define your goal, and choose channels to generate a strategy.</DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger><Label className="text-lg font-semibold cursor-pointer">Choose a Strategy Template</Label></AccordionTrigger>
                        <AccordionContent className="pt-4">
                            {customPresets.length > 0 && (<div className="mt-4"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4"/> Your Custom Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{customPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>)}
                            <div className="mt-6"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><Stars className="h-4 w-4"/> Global Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{globalPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="space-y-4">
                    <Label htmlFor="offering-select" className="text-lg font-semibold">Choose an Offering</Label>
                    <Select onValueChange={setSelectedOfferingId} defaultValue={selectedOfferingId || undefined} disabled={!!funnelToEdit}>
                        <SelectTrigger id="offering-select" className="text-base py-6"><SelectValue placeholder="Select an offering to promote..." /></SelectTrigger>
                        <SelectContent>{offerings.map(o => (<SelectItem key={o.id} value={o.id}>{o.title.primary}</SelectItem>))}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-4"><Label htmlFor="goal" className="text-lg font-semibold">Define Your Goal</Label><Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Get 50 signups for my webinar" className="text-base py-6"/></div>
                <div className="space-y-4">
                    <Label className="text-lg font-semibold">Select Target Channels</Label>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">{availableChannels.map(c => (<div key={c} className="flex items-center space-x-2"><Checkbox id={`c-${c}`} checked={selectedChannels.includes(c)} onCheckedChange={() => handleChannelToggle(c)} /><Label htmlFor={`c-${c}`} className="capitalize cursor-pointer">{c.replace(/_/g, ' ')}</Label></div>))}</div>
                    {availableChannels.length === 0 && (<p className="text-muted-foreground text-center text-sm">No channels enabled. Go to Accounts to enable them.</p>)}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleGenerateBlueprint} disabled={!canGenerate || isGenerating}>{isGenerating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Blueprint</>}</Button>
            </DialogFooter>
        </>
    );

    const renderBlueprintStep = () => (
         <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Edit Blueprint</DialogTitle><DialogDescription>Review and refine the AI-generated strategic blueprint for your campaign.</DialogDescription></DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                {!generatedContent ? (<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>) : (
                    <><div className="space-y-2"><Label htmlFor="funnelName" className="text-lg font-semibold">Strategy Title</Label><Input id="funnelName" value={name} onChange={(e) => setName(e.target.value)} className="text-lg"/></div>
                    <div className="space-y-6">{generatedContent.strategy.map((stage, sIdx) => (<Card key={sIdx}><CardHeader><Input value={stage.stageName} onChange={(e) => handleBlueprintChange(sIdx, 'stageName', e.target.value)} className="text-xl font-bold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"/></CardHeader><CardContent className="space-y-4"><div className="space-y-1"><Label>Objective</Label><Textarea value={stage.objective} onChange={(e) => handleBlueprintChange(sIdx, 'objective', e.target.value)} /></div><div className="space-y-1"><Label>Key Message</Label><Textarea value={stage.keyMessage} onChange={(e) => handleBlueprintChange(sIdx, 'keyMessage', e.target.value)} /></div><div><Label>Conceptual Steps</Label><div className="space-y-2 mt-1">{stage.conceptualSteps.map((step, stepIdx) => (<div key={step.step} className="p-2 border rounded-md space-y-1"><Input value={step.objective} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'objective', e.target.value)} className="font-semibold text-sm"/><Textarea value={step.concept} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'concept', e.target.value)} rows={2} className="text-sm"/></div>))}</div></div></CardContent></Card>))}</div></>
                )}
            </div>
            <DialogFooter>
                {funnelToEdit ? (
                     <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                ) : (
                    <Button variant="outline" onClick={() => setStep('selection')} disabled={isSaving}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                )}
                <Button onClick={handleSave} disabled={isSaving || !generatedContent}>{isSaving ? 'Saving...' : 'Save Strategy'}</Button>
            </DialogFooter>
        </>
    );
    
    // When editing, only show the blueprint step.
    if(funnelToEdit) {
        return (
             <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-4xl">
                    {renderBlueprintStep()}
                </DialogContent>
            </Dialog>
        )
    }

    // For creation, show the multi-step flow.
    const renderContent = () => {
        switch (step) {
            case 'selection': return renderSelectionStep();
            case 'edit_blueprint': return renderBlueprintStep();
            default: return renderSelectionStep();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
}
