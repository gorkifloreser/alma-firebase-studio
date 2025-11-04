

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
import { Bot, User, Stars, Sparkles, ArrowLeft, PlusCircle, Trash2, Info, CheckCircle2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput, ConceptualStep } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { summarizeMarket } from '@/app/market-analysis/actions';
import type { MarketAnalysisReport } from '@/app/market-analysis/actions';
import { Separator } from '@/components/ui/separator';


interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnelPresets: FunnelPreset[];
    marketReports: MarketAnalysisReport[];
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
    marketReports,
    onFunnelSaved,
    funnelToEdit,
}: CreateFunnelDialogProps) {
    // Step 1 State
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
    const [goal, setGoal] = useState('');
    const [selectedReportId, setSelectedReportId] = useState<string | 'custom' | null>(null);
    const [marketQuery, setMarketQuery] = useState('');
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [usedContext, setUsedContext] = useState<UsedContext>(null);
    
    // Step 2 State
    const [generatedContent, setGeneratedContent] = useState<GenerateFunnelOutput | null>(null);
    const [editableStrategy, setEditableStrategy] = useState<EditableStrategy | null>(null);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const isEditMode = !!funnelToEdit;
    
    useEffect(() => {
        if (isOpen) {
            getOfferings().then(setOfferings);

            if (funnelToEdit) {
                setSelectedOfferingId(funnelToEdit.offering_id);
                setSelectedPresetId(funnelToEdit.preset_id);
                setGoal(funnelToEdit.goal || '');
                // In edit mode, we don't pre-fill market context.
                setMarketQuery(''); 
                setSelectedReportId(null);
                setGeneratedContent(funnelToEdit.strategy_brief);
                setEditableStrategy(funnelToEdit.strategy_brief);
            } else {
                // Reset all state for new funnel
                setSelectedOfferingId(null);
                setSelectedPresetId(null);
                setGeneratedContent(null);
                setEditableStrategy(null);
                setGoal('');
                setMarketQuery('');
                setUsedContext(null);

                // Pre-select the latest market report
                if (marketReports && marketReports.length > 0) {
                    setSelectedReportId(marketReports[0].id);
                } else {
                    setSelectedReportId(null);
                }
            }
        }
    }, [isOpen, funnelToEdit, marketReports]);
    
    // Auto-summarize market for custom query when offering is selected
    useEffect(() => {
        if (selectedOfferingId && !isEditMode && (!marketReports || marketReports.length === 0)) {
            startGenerating(async () => {
                try {
                    const { marketSummaryPhrase } = await summarizeMarket();
                    setMarketQuery(marketSummaryPhrase);
                } catch (error: any) {
                    // It's okay if this fails, user can still type manually
                    console.warn("Could not auto-summarize market:", error.message);
                }
            });
        }
    }, [selectedOfferingId, isEditMode, marketReports]);


    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null && goal.trim() !== '';

    const handleGenerateBlueprint = async () => {
        if (!canGenerate) return;

        startGenerating(async () => {
            try {
                const preset = funnelPresets.find(p => p.id === selectedPresetId);
                const offering = offerings.find(o => o.id === selectedOfferingId);
                if (!preset || !offering) throw new Error("Selected preset or offering not found.");
                
                const marketContext = selectedReportId === 'custom' 
                    ? marketQuery 
                    : marketReports.find(r => r.id === selectedReportId)?.title;

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
                    marketContext: marketContext,
                });
                
                setGeneratedContent(result);
                setEditableStrategy(result); // Set the editable state
                toast({ title: 'Strategy Generated!', description: 'Review and refine the strategy below.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Generation Failed', description: error.message });
                 setUsedContext(null);
            }
        });
    };

    const handleSave = async () => {
        const offeringName = offerings.find(o => o.id === selectedOfferingId)?.title.primary || 'Untitled';
        const presetName = funnelPresets.find(p => p.id === selectedPresetId)?.title || 'Custom';
        const finalName = `${offeringName}: ${presetName}`;
        
        if (!selectedPresetId || !selectedOfferingId || !editableStrategy) return;

        startSaving(async () => {
             try {
                const payload = {
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    name: finalName,
                    goal,
                    strategyBrief: editableStrategy,
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

    const handleStageChange = (stageIndex: number, field: 'stageName' | 'objective' | 'keyMessage', value: string) => {
        if (!editableStrategy) return;
        const newStrategy = [...editableStrategy.strategy];
        (newStrategy[stageIndex] as any)[field] = value;
        setEditableStrategy(prev => ({
            ...prev!,
            strategy: newStrategy,
        }));
    };
    
    const handleStepChange = (stageIndex: number, stepIndex: number, field: 'concept' | 'objective', value: string) => {
         if (!editableStrategy) return;
        const newStrategy = [...editableStrategy.strategy];
        (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value;
        setEditableStrategy(prev => ({
            ...prev!,
            strategy: newStrategy,
        }));
    };

    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        {isEditMode ? 'Edit AI Strategy' : 'Create a New AI Strategy'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Refine the details of your strategic plan.' : 'Select an offering, define your goal and market, then generate a plan.'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-6">
                   {!generatedContent ? (
                        <div className="space-y-8">
                            {/* Step 1: Choose Offering */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold">1. Choose an Offering</Label>
                                <Select onValueChange={setSelectedOfferingId} value={selectedOfferingId || undefined}>
                                    <SelectTrigger id="offering-select" className="text-base py-6">
                                        <SelectValue placeholder="Select an offering to promote..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {offerings.map(o => (<SelectItem key={o.id} value={o.id}>{o.title.primary}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Step 2: Define Goal */}
                            <div className="space-y-4">
                                <Label htmlFor="goal" className="text-lg font-semibold">2. Define Your Goal</Label>
                                <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Get 50 signups for my webinar" className="text-base py-6"/>
                            </div>
                            
                            {/* Step 3: Market Context */}
                             <div className="space-y-4">
                                <Label className="text-lg font-semibold flex items-center gap-2">
                                    <Search className="h-5 w-5" /> 3. Define Market Context
                                </Label>
                                <Select onValueChange={setSelectedReportId} value={selectedReportId || undefined}>
                                    <SelectTrigger id="report-select" className="text-base">
                                        <SelectValue placeholder="Select a saved market report..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">Use Custom Query Below</SelectItem>
                                        <Separator className="my-1"/>
                                        {marketReports.map((report, index) => (
                                            <SelectItem key={report.id} value={report.id}>
                                                {report.title} {index === 0 && '(Latest)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {(selectedReportId === 'custom' || marketReports.length === 0) && (
                                    <Textarea 
                                        id="market-query" 
                                        value={marketQuery}
                                        onChange={(e) => setMarketQuery(e.target.value)} 
                                        placeholder="Tell the AI what market to research, e.g., 'artisanal cacao products' or 'competitors like Brand X'"
                                        rows={3}
                                    />
                                )}
                                {isGenerating && !marketQuery && <p className="text-sm text-muted-foreground animate-pulse">Getting market suggestions...</p>}
                            </div>
                            
                            {/* Step 4: Choose Template */}
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                        <Label className="text-lg font-semibold cursor-pointer">4. Choose a Strategy Template</Label>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4">
                                        {customPresets.length > 0 && (<div className="mt-4"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4"/> Your Custom Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{customPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>)}
                                        <div className="mt-6"><h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><Stars className="h-4 w-4"/> Global Templates</h4><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{globalPresets.map(p => (<Card key={p.id} className={cn("cursor-pointer transition-all", selectedPresetId === p.id && "ring-2 ring-primary")} onClick={() => setSelectedPresetId(p.id)}><CardContent className="p-4"><h3 className="font-bold">{p.title}</h3><p className="text-xs text-primary font-semibold mt-1">Best for: {p.best_for}</p></CardContent></Card>))}</div></div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            <Button onClick={handleGenerateBlueprint} disabled={!canGenerate || isGenerating} className="w-full">
                                {isGenerating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Strategy</>}
                            </Button>
                        </div>
                   ) : (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold border-b pb-2">Generated Strategy</h3>
                            {isGenerating ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            ) : (
                                <>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Overall Success Metrics</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                                {editableStrategy?.campaignSuccessMetrics?.map((metric, i) => <li key={i}>{metric}</li>)}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={editableStrategy?.strategy.map((_, i) => `stage-${i}`)}>
                                        {editableStrategy?.strategy?.map((stage, stageIndex) => (
                                            <AccordionItem value={`stage-${stageIndex}`} key={stageIndex} className="border rounded-lg bg-card">
                                                <AccordionTrigger className="p-4 hover:no-underline">
                                                    <Input
                                                        value={stage.stageName}
                                                        onChange={(e) => handleStageChange(stageIndex, 'stageName', e.target.value)}
                                                        className="text-lg font-bold border-0 shadow-none -ml-3 focus-visible:ring-1 focus-visible:ring-primary h-auto p-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 pt-0 space-y-4">
                                                    <div className="space-y-2"><Label>Objective:</Label><Textarea value={stage.objective} onChange={(e) => handleStageChange(stageIndex, 'objective', e.target.value)} /></div>
                                                    <div className="space-y-2"><Label>Key Message:</Label><Textarea value={stage.keyMessage} onChange={(e) => handleStageChange(stageIndex, 'keyMessage', e.target.value)} /></div>
                                                    <div>
                                                        <Label className="font-semibold text-sm mb-2">Conceptual Steps:</Label>
                                                        <div className="space-y-2 mt-2">
                                                            {stage.conceptualSteps?.map((step, stepIndex) => (
                                                                <div key={stepIndex} className="p-3 border rounded-md bg-secondary/50 space-y-2">
                                                                    <Textarea value={step.objective} onChange={(e) => handleStepChange(stageIndex, stepIndex, 'objective', e.target.value)} className="font-semibold" />
                                                                    <Textarea value={step.concept} onChange={(e) => handleStepChange(stageIndex, stepIndex, 'concept', e.target.value)} className="text-sm text-muted-foreground" rows={3}/>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </>
                            )}
                        </div>
                   )}
                </div>

                <DialogFooter>
                    {generatedContent && (
                        <Button variant="ghost" onClick={() => setGeneratedContent(null)}><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !editableStrategy}>
                        {isSaving ? 'Saving...' : 'Save Strategy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
