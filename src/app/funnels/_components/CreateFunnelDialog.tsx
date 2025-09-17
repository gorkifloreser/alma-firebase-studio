
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFunnel, generateFunnelPreview, FunnelPreset } from '../actions';
import { Offering } from '@/app/offerings/actions';
import { Bot, User, Stars, Sparkles, MessageSquare, Mail, Instagram, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput, ChannelStrategy, ConceptualStep } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getUserChannels } from '@/app/accounts/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';


interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    funnelPresets: FunnelPreset[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
}

type DialogStep = 'selection' | 'edit_blueprint' | 'assign_channels';

// Make all properties of the generated output editable
type EditableStrategy = {
    campaignSuccessMetrics: string[];
    strategy: Array<{
        stageName: string;
        objective: string;
        keyMessage: string;
        conceptualSteps: Array<{
            step: number;
            concept: string;
            objective: string;
        }>;
        successMetrics: string[];
    }>
};

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    funnelPresets,
    onFunnelCreated,
    defaultOfferingId,
}: CreateFunnelDialogProps) {
    const [step, setStep] = useState<DialogStep>('selection');
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(defaultOfferingId || null);
    const [funnelName, setFunnelName] = useState('');
    const [goal, setGoal] = useState('');
    const [availableChannels, setAvailableChannels] = useState<string[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState<EditableStrategy | null>(null);
    
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            // Reset state when dialog opens
            setStep('selection');
            setSelectedOfferingId(defaultOfferingId || null);
            setSelectedPresetId(null);
            setGeneratedContent(null);
            setFunnelName('');
            setGoal('');
            
            // Fetch channels
            getUserChannels().then(channels => {
                setAvailableChannels(channels);
                setSelectedChannels(channels); // Default to all selected
            });
        }
    }, [isOpen, defaultOfferingId]);

    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null && goal.trim() !== '';

    const handleGenerate = async () => {
        if (!canGenerate) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please select a template, an offering, and define a goal.',
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
                });
                
                setGeneratedContent(result);
                setFunnelName(`${offering.title.primary}: ${preset.title}`);
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
        if (!selectedPresetId || !selectedOfferingId || !generatedContent || !funnelName.trim()) {
             toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please ensure the strategy has a title and content before saving.',
            });
            return;
        }

        startSaving(async () => {
             try {
                await createFunnel({
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    funnelName: funnelName,
                    strategyBrief: {
                        ...generatedContent,
                        channels: selectedChannels, // Add assigned channels on save
                    } as GenerateFunnelOutput,
                });
                onFunnelCreated();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Strategy Creation Failed',
                    description: error.message,
                });
            }
        });
    }

    const handleChannelToggle = (channel: string) => {
        setSelectedChannels(prev => 
            prev.includes(channel)
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        );
    }
    
    const handleBlueprintChange = (stageIndex: number, field: keyof EditableStrategy['strategy'][0], value: string) => {
        if (!generatedContent) return;
        const newStrategy = [...generatedContent.strategy];
        (newStrategy[stageIndex] as any)[field] = value;
        setGeneratedContent({ ...generatedContent, strategy: newStrategy });
    }
    
    const handleConceptualStepChange = (stageIndex: number, stepIndex: number, field: keyof ConceptualStep, value: string) => {
        if (!generatedContent) return;
        const newStrategy = [...generatedContent.strategy];
        (newStrategy[stageIndex].conceptualSteps[stepIndex] as any)[field] = value;
        setGeneratedContent({ ...generatedContent, strategy: newStrategy });
    }


    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    const renderSelectionStep = () => (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                     <Sparkles className="text-primary"/>
                    Create a New Strategy (Step 1 of 3)
                </DialogTitle>
                <DialogDescription>
                   Follow the steps to select a template, define your goal, and generate a tailored strategy blueprint.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <Label className="text-lg font-semibold cursor-pointer">Choose a Strategy Template</Label>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            {customPresets.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4"/> Your Custom Templates</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {customPresets.map((preset) => (
                                    <Card 
                                        key={preset.id} 
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            selectedPresetId === preset.id 
                                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                                : "hover:bg-muted/50"
                                        )}
                                        onClick={() => setSelectedPresetId(preset.id)}
                                    >
                                        <CardContent className="p-4">
                                            <h3 className="font-bold">{preset.title}</h3>
                                            <p className="text-xs text-primary font-semibold mt-1">
                                                Best for: {preset.best_for}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6">
                                <h4 className="text-md font-semibold mb-2 flex items-center gap-2 text-muted-foreground"><Stars className="h-4 w-4"/> Global Templates</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {globalPresets.map((preset) => (
                                    <Card 
                                        key={preset.id} 
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            selectedPresetId === preset.id 
                                                ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                                : "hover:bg-muted/50"
                                        )}
                                        onClick={() => setSelectedPresetId(preset.id)}
                                    >
                                        <CardContent className="p-4">
                                            <h3 className="font-bold">{preset.title}</h3>
                                            <p className="text-xs text-primary font-semibold mt-1">
                                                Best for: {preset.best_for}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="space-y-4">
                <Label htmlFor="offering-select" className="text-lg font-semibold">Choose an Offering</Label>
                    <Select onValueChange={setSelectedOfferingId} defaultValue={defaultOfferingId || undefined}>
                    <SelectTrigger id="offering-select" className="text-base py-6">
                        <SelectValue placeholder="Select an offering to promote..." />
                    </SelectTrigger>
                    <SelectContent>
                        {offerings.map(offering => (
                            <SelectItem key={offering.id} value={offering.id}>{offering.title.primary}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>
                 <div className="space-y-4">
                    <Label htmlFor="goal" className="text-lg font-semibold">Define Your Goal</Label>
                    <Input
                        id="goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Get 50 signups for my webinar"
                        className="text-base py-6"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                    {isGenerating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Blueprint</>}
                </Button>
            </DialogFooter>
        </>
    );

    const renderBlueprintStep = () => (
         <>
            <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                     <Sparkles className="text-primary"/>
                    Edit Blueprint (Step 2 of 3)
                </DialogTitle>
                <DialogDescription>
                    Review and refine the AI-generated strategic blueprint for your campaign.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                {!generatedContent ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="funnelName" className="text-lg font-semibold">Strategy Title</Label>
                            <Input
                                id="funnelName"
                                value={funnelName}
                                onChange={(e) => setFunnelName(e.target.value)}
                                className="text-lg"
                            />
                        </div>
                        <div className="space-y-6">
                            {generatedContent.strategy.map((stage, stageIndex) => (
                                <Card key={stageIndex}>
                                    <CardHeader>
                                        <Input 
                                            value={stage.stageName}
                                            onChange={(e) => handleBlueprintChange(stageIndex, 'stageName', e.target.value)}
                                            className="text-xl font-bold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"
                                        />
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1">
                                            <Label>Objective</Label>
                                            <Textarea value={stage.objective} onChange={(e) => handleBlueprintChange(stageIndex, 'objective', e.target.value)} />
                                        </div>
                                         <div className="space-y-1">
                                            <Label>Key Message</Label>
                                            <Textarea value={stage.keyMessage} onChange={(e) => handleBlueprintChange(stageIndex, 'keyMessage', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label>Conceptual Steps</Label>
                                             <div className="space-y-2 mt-1">
                                                {stage.conceptualSteps.map((step, stepIndex) => (
                                                     <div key={step.step} className="p-2 border rounded-md space-y-1">
                                                        <Input
                                                          value={step.objective}
                                                          onChange={(e) => handleConceptualStepChange(stageIndex, stepIndex, 'objective', e.target.value)}
                                                          className="font-semibold text-sm"
                                                        />
                                                        <Textarea
                                                            value={step.concept}
                                                            onChange={(e) => handleConceptualStepChange(stageIndex, stepIndex, 'concept', e.target.value)}
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
                    </>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStep('selection')} disabled={isSaving}>
                     <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep('assign_channels')} disabled={isSaving || !generatedContent}>
                    Next: Assign Channels <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </DialogFooter>
        </>
    );

    const renderChannelStep = () => (
         <>
            <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                     <Sparkles className="text-primary"/>
                    Assign Channels (Step 3 of 3)
                </DialogTitle>
                <DialogDescription>
                    Select which of your enabled channels you want to use for this strategy.
                </DialogDescription>
            </DialogHeader>
             <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Enabled Channels</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {availableChannels.map(channel => (
                                <div key={channel} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`channel-${channel}`}
                                        checked={selectedChannels.includes(channel)}
                                        onCheckedChange={() => handleChannelToggle(channel)}
                                    />
                                    <Label htmlFor={`channel-${channel}`} className="capitalize cursor-pointer">
                                        {channel.replace(/_/g, ' ')}
                                    </Label>
                                </div>
                            ))}
                        </div>
                         {availableChannels.length === 0 && (
                            <p className="text-muted-foreground text-center">You have no channels enabled. Go to the Accounts page to enable some.</p>
                         )}
                    </CardContent>
                </Card>
             </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStep('edit_blueprint')} disabled={isSaving}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
                </Button>
                <Button onClick={handleSave} disabled={isSaving || selectedChannels.length === 0}>
                    {isSaving ? 'Saving...' : 'Save Strategy'}
                </Button>
            </DialogFooter>
        </>
    );

    const renderContent = () => {
        switch (step) {
            case 'selection': return renderSelectionStep();
            case 'edit_blueprint': return renderBlueprintStep();
            case 'assign_channels': return renderChannelStep();
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
