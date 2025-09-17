

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
import { generateMediaPlan as generateMediaPlanAction, regeneratePlanItem, saveContent } from '../actions';
import { Offering } from '@/app/offerings/actions';
import { Bot, User, Stars, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Trash2, PlusCircle, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput, ConceptualStep } from '@/ai/flows/generate-funnel-flow';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getUserChannels } from '@/app/accounts/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SelectGroup, SelectLabel } from '@/components/ui/select';
import { ContentGenerationDialog } from '@/app/offerings/_components/ContentGenerationDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    funnelPresets: FunnelPreset[];
    onFunnelSaved: () => void;
    funnelToEdit?: Funnel | null;
    initialStep?: DialogStep;
}

type DialogStep = 'selection' | 'edit_blueprint' | 'orchestrate';
type PlanItemWithId = PlanItem & { id: string };
type RegeneratingState = { [itemId: string]: boolean };

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

const mediaFormatConfig = [
    { label: "Image", formats: [ { value: '1:1 Square Image', channels: ['instagram', 'facebook'] }, { value: '4:5 Portrait Image', channels: ['instagram', 'facebook'] }, { value: '9:16 Story Image', channels: ['instagram', 'facebook'] }, ] },
    { label: "Video", formats: [ { value: '9:16 Reel/Short', channels: ['instagram', 'facebook', 'tiktok', 'linkedin'] }, { value: '1:1 Square Video', channels: ['instagram', 'facebook', 'linkedin'] }, { value: '16:9 Landscape Video', channels: ['facebook', 'linkedin', 'website'] }, ] },
    { label: "Text & Communication", formats: [ { value: 'Text Post', channels: ['facebook', 'linkedin'] }, { value: 'Carousel (3-5 slides)', channels: ['instagram', 'facebook', 'linkedin'] }, { value: 'Newsletter', channels: ['webmail'] }, { value: 'Promotional Email', channels: ['webmail'] }, { value: 'Blog Post', channels: ['website'] }, { value: 'Text Message', channels: ['whatsapp', 'telegram'] }, ] }
];

const getFormatsForChannel = (channel: string): string[] => {
    const channelLower = channel.toLowerCase();
    return mediaFormatConfig.flatMap(category => 
        category.formats.filter(format => format.channels.includes(channelLower)).map(format => format.value)
    );
};

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    funnelPresets,
    onFunnelSaved,
    funnelToEdit,
    initialStep = 'selection',
}: CreateFunnelDialogProps) {
    const [step, setStep] = useState<DialogStep>(initialStep);
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);
    const [funnelName, setFunnelName] = useState('');
    const [goal, setGoal] = useState('');
    const [availableChannels, setAvailableChannels] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState<EditableStrategy | null>(null);
    
    // Media Plan State
    const [planItems, setPlanItems] = useState<PlanItemWithId[]>([]);
    const [isGeneratingMediaPlan, startGeneratingMediaPlan] = useTransition();
    const [isRegenerating, setIsRegenerating] = useState<RegeneratingState>({});

    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    // State for the nested dialog
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [offeringForContent, setOfferingForContent] = useState<Offering | null>(null);
    const [sourcePlanItem, setSourcePlanItem] = useState<PlanItem | null>(null);
    
    useEffect(() => {
        if (isOpen) {
            setStep(initialStep);
            if (funnelToEdit) {
                setSelectedOfferingId(funnelToEdit.offering_id);
                setSelectedPresetId(funnelToEdit.preset_id);
                setFunnelName(funnelToEdit.name);
                setGoal(funnelToEdit.goal || '');
                if (funnelToEdit.strategy_brief) {
                    setGeneratedContent(funnelToEdit.strategy_brief);
                    setSelectedChannels(funnelToEdit.strategy_brief.channels || []);
                }
                if (funnelToEdit.media_plan) {
                    validateAndSetPlanItems(funnelToEdit.media_plan);
                } else {
                    setPlanItems([]);
                }
                
                // If orchestrate is the initial step and no plan exists, generate it.
                if (initialStep === 'orchestrate' && !funnelToEdit.media_plan) {
                    handleGenerateMediaPlan();
                }

            } else {
                // Reset state for new funnel
                setSelectedOfferingId(null);
                setSelectedPresetId(null);
                setGeneratedContent(null);
                setFunnelName('');
                setGoal('');
                setPlanItems([]);
            }
            
            // Fetch channels
            getUserChannels().then(channels => {
                setAvailableChannels(channels);
                if (!funnelToEdit) {
                    setSelectedChannels(channels); // Default to all selected
                }
            });
        }
    }, [isOpen, funnelToEdit, initialStep]);

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
                    setFunnelName(`${offering.title.primary}: ${preset.title}`);
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

    const handleGenerateMediaPlan = () => {
        const currentFunnelId = funnelToEdit?.id;
        if (currentFunnelId) {
            startGeneratingMediaPlan(async () => {
                try {
                    const result = await generateMediaPlanAction({ funnelId: currentFunnelId });
                    validateAndSetPlanItems(result.plan);
                    setStep('orchestrate');
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
        } else {
            // This is a new funnel, save it first then generate.
            handleSave(true);
        }
    };


    const handleSave = async (proceedToNextStep = false) => {
        if (!selectedPresetId || !selectedOfferingId || !generatedContent || !funnelName.trim()) {
             toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure the strategy has a title and content before saving.'});
            return;
        }

        startSaving(async () => {
             try {
                const payload = {
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    funnelName: funnelName,
                    goal: goal,
                    strategyBrief: { ...generatedContent, channels: selectedChannels } as GenerateFunnelOutput,
                    mediaPlan: planItems.length > 0 ? planItems.map(({id, ...rest}) => rest) : null,
                };

                let savedFunnel: Funnel;
                if (funnelToEdit) {
                    savedFunnel = await updateFunnel(funnelToEdit.id, payload);
                } else {
                    savedFunnel = await createFunnel(payload);
                }

                if (proceedToNextStep) {
                    // This is a special case for new funnels. We save, then immediately generate the plan.
                    // We need a way to pass the new funnel ID to handleGenerateMediaPlan.
                    // A simple way is to re-call it after setting the new funnel data.
                    toast({ title: 'Strategy Saved!', description: 'Now, let\'s orchestrate the media plan.' });
                    
                    const newFunnelForEdit = { ...funnelToEdit, ...savedFunnel };

                    startGeneratingMediaPlan(async () => {
                        try {
                            const result = await generateMediaPlanAction({ funnelId: newFunnelForEdit.id });
                            validateAndSetPlanItems(result.plan);
                            setStep('orchestrate');
                            toast({
                                title: 'Media Plan Generated!',
                                description: 'Review and edit the suggested content ideas below.'
                            });
                        } catch (error: any) {
                             toast({ variant: 'destructive', title: 'Media Plan Generation Failed', description: error.message, });
                        }
                    });

                } else {
                    onFunnelSaved();
                }

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Save Failed', description: error.message, });
            }
        });
    }

    const handleChannelToggle = (channel: string) => { setSelectedChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]); }
    const handleBlueprintChange = (stageIndex: number, field: keyof EditableStrategy['strategy'][0], value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy }); }
    const handleConceptualStepChange = (stageIndex: number, stepIndex: number, field: keyof ConceptualStep, value: string) => { if (!generatedContent) return; const newStrategy = [...generatedContent.strategy]; (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value; setGeneratedContent({ ...generatedContent, strategy: newStrategy });}

    // Media Plan functions
    const validateAndSetPlanItems = (items: PlanItem[]) => { const validatedItems = items.map(item => { const validFormats = getFormatsForChannel(item.channel); const formatIsValid = validFormats.includes(item.format); return { ...item, format: formatIsValid ? item.format : (validFormats[0] || 'Text Post'), id: crypto.randomUUID(),}; }); setPlanItems(validatedItems); };
    const handleRegenerateItem = async (itemToRegen: PlanItemWithId) => { const funnelId = funnelToEdit?.id; if (!funnelId || !itemToRegen.conceptualStep) return; setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true })); try { const newItem = await regeneratePlanItem({ funnelId: funnelId, channel: itemToRegen.channel, conceptualStep: itemToRegen.conceptualStep }); const validFormats = getFormatsForChannel(newItem.channel); const formatIsValid = validFormats.includes(newItem.format); setPlanItems(prev => prev.map(item => item.id === itemToRegen.id ? { ...newItem, id: itemToRegen.id, format: formatIsValid ? newItem.format : (validFormats[0] || 'Text Post') } : item )); toast({ title: 'Item Regenerated!', description: 'The content idea has been updated.'}); } catch (error: any) { toast({ variant: 'destructive', title: 'Regeneration Failed', description: error.message, }); } finally { setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: false })); } }
    const handleItemChange = (itemId: string, field: 'format' | 'copy' | 'hashtags' | 'creativePrompt', value: string) => { setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item)); }
    const handleStageNameChange = (itemId: string, value: string) => { setPlanItems(prev => prev.map(item => { if (item.id === itemId && item.conceptualStep) { return { ...item, conceptualStep: { ...item.conceptualStep, stageName: value } }; } return item; })); };
    const handleObjectiveChange = (itemId: string, value: string) => { setPlanItems(prev => prev.map(item => { if (item.id === itemId && item.conceptualStep) { return { ...item, conceptualStep: { ...item.conceptualStep, objective: value } }; } return item; })); };
    const handleRemoveItem = (itemId: string) => { setPlanItems(prev => prev.filter(item => item.id !== itemId)); };
    const handleAddNewItem = (channel: string) => { const newItem: PlanItemWithId = { id: crypto.randomUUID(), offeringId: selectedOfferingId || '', channel: channel, format: getFormatsForChannel(channel)[0] || 'Text Post', copy: '', hashtags: '', creativePrompt: '', conceptualStep: { objective: 'Your new objective here', stageName: 'Uncategorized', }, }; setPlanItems(prev => [...prev, newItem]); };

    const handleApproveContent = (planItem: PlanItem) => {
        const offering = offerings.find(o => o.id === planItem.offeringId);
        if (offering) {
            setSourcePlanItem(planItem);
            setOfferingForContent(offering);
            setIsContentDialogOpen(true);
        } else {
             toast({ variant: 'destructive', title: 'Offering not found' });
        }
    };

    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    const groupedByChannel = useMemo(() => {
        return planItems.reduce((acc, item) => {
            const channelKey = item.channel || 'General';
            if (!acc[channelKey]) acc[channelKey] = [];
            acc[channelKey].push(item);
            return acc;
        }, {} as Record<string, PlanItemWithId[]>);
    }, [planItems]);
    const channelsForTabs = Object.keys(groupedByChannel);

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
                    <><div className="space-y-2"><Label htmlFor="funnelName" className="text-lg font-semibold">Strategy Title</Label><Input id="funnelName" value={funnelName} onChange={(e) => setFunnelName(e.target.value)} className="text-lg"/></div>
                    <div className="space-y-6">{generatedContent.strategy.map((stage, sIdx) => (<Card key={sIdx}><CardHeader><Input value={stage.stageName} onChange={(e) => handleBlueprintChange(sIdx, 'stageName', e.target.value)} className="text-xl font-bold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"/></CardHeader><CardContent className="space-y-4"><div className="space-y-1"><Label>Objective</Label><Textarea value={stage.objective} onChange={(e) => handleBlueprintChange(sIdx, 'objective', e.target.value)} /></div><div className="space-y-1"><Label>Key Message</Label><Textarea value={stage.keyMessage} onChange={(e) => handleBlueprintChange(sIdx, 'keyMessage', e.target.value)} /></div><div><Label>Conceptual Steps</Label><div className="space-y-2 mt-1">{stage.conceptualSteps.map((step, stepIdx) => (<div key={step.step} className="p-2 border rounded-md space-y-1"><Input value={step.objective} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'objective', e.target.value)} className="font-semibold text-sm"/><Textarea value={step.concept} onChange={(e) => handleConceptualStepChange(sIdx, stepIdx, 'concept', e.target.value)} rows={2} className="text-sm"/></div>))}</div></div></CardContent></Card>))}</div></>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStep('selection')} disabled={isSaving}> <ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={handleGenerateMediaPlan} disabled={isSaving || !generatedContent}>{isSaving ? 'Saving...' : 'Next: Orchestrate Content'} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </DialogFooter>
        </>
    );

    const renderOrchestrateStep = () => (
         <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Orchestrate Media Plan</DialogTitle><DialogDescription>Generate, edit, and approve the tactical content pieces for each channel.</DialogDescription></DialogHeader>
            <div className="max-h-[60vh] flex flex-col overflow-hidden py-4">
                {isGeneratingMediaPlan ? (<div className="space-y-4 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>) : 
                planItems.length > 0 ? (
                    <Tabs defaultValue={channelsForTabs[0]} className="w-full flex-1 flex flex-col min-h-0">
                        <div className="flex justify-center"><TabsList>{channelsForTabs.map(c => (<TabsTrigger key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</TabsTrigger>))}</TabsList></div>
                        <div className="flex-1 overflow-y-auto mt-4 pr-4">
                            {channelsForTabs.map(c => (
                                <TabsContent key={c} value={c} className="mt-0">
                                    <div className="space-y-4">{groupedByChannel[c].map((item) => (
                                        <div key={item.id} className="p-4 border rounded-lg space-y-4 relative">
                                            <div className="absolute top-2 right-2 flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRegenerateItem(item)} disabled={isRegenerating[item.id]}><RefreshCw className={`h-4 w-4 ${isRegenerating[item.id] ? 'animate-spin' : ''}`} /></Button>
                                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="space-y-1 pr-24"><Label htmlFor={`stageName-${item.id}`}>Strategy Stage</Label><Input id={`stageName-${item.id}`} value={item.conceptualStep?.stageName || ''} onChange={(e) => handleStageNameChange(item.id, e.target.value)} className="font-semibold bg-muted/50" readOnly/></div>
                                            <div className="space-y-1"><Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label><Input id={`objective-${item.id}`} value={item.conceptualStep?.objective || ''} onChange={(e) => handleObjectiveChange(item.id, e.target.value)} placeholder="e.g., Build social proof"/></div>
                                            <div className="space-y-1"><Label htmlFor={`format-${item.id}`}>Format</Label><Select value={item.format} onValueChange={(v) => handleItemChange(item.id, 'format', v)}><SelectTrigger id={`format-${item.id}`} className="font-semibold"><SelectValue placeholder="Select a format" /></SelectTrigger><SelectContent>{mediaFormatConfig.map(g => { const channelFormats = g.formats.filter(f => f.channels.includes(item.channel.toLowerCase())); if (channelFormats.length === 0) return null; return (<SelectGroup key={g.label}><SelectLabel>{g.label}</SelectLabel>{channelFormats.map(f => (<SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>))}</SelectGroup>)})}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label htmlFor={`hashtags-${item.id}`}>Hashtags / Keywords</Label><Input id={`hashtags-${item.id}`} value={item.hashtags} onChange={(e) => handleItemChange(item.id, 'hashtags', e.target.value)}/></div>
                                            <div className="space-y-1"><Label htmlFor={`copy-${item.id}`}>Copy</Label><Textarea id={`copy-${item.id}`} value={item.copy} onChange={(e) => handleItemChange(item.id, 'copy', e.target.value)} className="text-sm" rows={4}/></div>
                                            <div className="space-y-1"><Label htmlFor={`prompt-${item.id}`}>Creative AI Prompt</Label><Textarea id={`prompt-${item.id}`} value={item.creativePrompt} onChange={(e) => handleItemChange(item.id, 'creativePrompt', e.target.value)} className="text-sm font-mono" rows={3}/></div>
                                            <Button size="sm" onClick={() => handleApproveContent(item)}><Wand2 className="mr-2 h-4 w-4"/>Approve & Generate Creative</Button>
                                        </div>
                                    ))}</div>
                                    <div className="flex justify-center mt-6"><Button variant="outline" onClick={() => handleAddNewItem(c)}><PlusCircle className="mr-2 h-4 w-4" />Add New Idea to this Channel</Button></div>
                                </TabsContent>
                            ))}
                        </div>
                    </Tabs>
                ) : (<div className="text-center text-muted-foreground py-10 flex-1 flex items-center justify-center">Click "Generate Plan" to begin.</div>)}
            </div>
             <DialogFooter className="mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('edit_blueprint')} disabled={isSaving}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blueprint</Button>
                <Button onClick={() => handleSave(false)} disabled={isSaving || isGeneratingMediaPlan || planItems.length === 0}>{isSaving ? 'Saving...' : 'Save & Close'}</Button>
            </DialogFooter>
         </>
    );

    const renderContent = () => {
        switch (step) {
            case 'selection': return renderSelectionStep();
            case 'edit_blueprint': return renderBlueprintStep();
            case 'orchestrate': return renderOrchestrateStep();
            default: return renderSelectionStep();
        }
    }

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                {renderContent()}
            </DialogContent>
        </Dialog>
        {offeringForContent && (
            <ContentGenerationDialog
                isOpen={isContentDialogOpen}
                onOpenChange={setIsContentDialogOpen}
                offeringId={offeringForContent.id}
                offeringTitle={offeringForContent.title.primary}
                funnels={[]} // Funnels are already considered in the strategy, not needed here.
                sourcePlanItem={sourcePlanItem}
            />
        )}
        </>
    );
}
