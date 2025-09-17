
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
import { createFunnel, generateFunnel as generateFunnelPreview, FunnelPreset } from '../actions';
import { Offering } from '@/app/offerings/actions';
import { Bot, User, Stars, Sparkles, MessageSquare, Mail, Instagram, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getUserChannels } from '@/app/accounts/actions';
import { Checkbox } from '@/components/ui/checkbox';


interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    funnelPresets: FunnelPreset[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
}

type DialogStep = 'selection' | 'preview';

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
    const [generatedContent, setGeneratedContent] = useState<GenerateFunnelOutput | null>(null);
    
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

    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null && goal.trim() !== '' && selectedChannels.length > 0;

    const handleGenerate = async () => {
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
                setFunnelName(`${offering.title.primary}: ${preset.title}`);
                setStep('preview');
                toast({
                    title: 'Strategy Blueprint Generated!',
                    description: 'Review the high-level strategy for each channel.',
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
                    strategyBrief: generatedContent,
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

    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    const renderSelectionStep = () => (
        <>
            <div className="space-y-8 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <Label className="text-lg font-semibold cursor-pointer">Step 1: Choose a Strategy Template</Label>
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
                <Label htmlFor="offering-select" className="text-lg font-semibold">Step 2: Choose an Offering</Label>
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
                    <Label htmlFor="goal" className="text-lg font-semibold">Step 3: Define Your Goal</Label>
                    <Input
                        id="goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Get 50 signups for my webinar"
                        className="text-base py-6"
                    />
                </div>
                <div className="space-y-4">
                    <Label className="text-lg font-semibold">Step 4: Select Target Channels</Label>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
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
    
    const ChannelIcon = ({ channel }: { channel: string }) => {
        if (channel.toLowerCase().includes('social')) return <Instagram className="h-5 w-5 text-muted-foreground" />;
        if (channel.toLowerCase().includes('email')) return <Mail className="h-5 w-5 text-muted-foreground" />;
        if (channel.toLowerCase().includes('whatsapp')) return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
        return <Sparkles className="h-5 w-5 text-muted-foreground" />;
    }

    const renderPreviewStep = () => (
         <>
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
                        <Card>
                             <CardHeader>
                                <CardTitle>Overall Campaign Success Metrics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {generatedContent.campaignSuccessMetrics.map((metric, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <p className="text-muted-foreground">{metric}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <div className="space-y-6">
                            {generatedContent.strategy.map((channelStrategy, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3">
                                            <ChannelIcon channel={channelStrategy.channel} />
                                            {channelStrategy.channel} Strategy
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold">Objective:</h4>
                                            <p className="text-muted-foreground">{channelStrategy.objective}</p>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold">Key Message:</h4>
                                            <p className="text-muted-foreground">{channelStrategy.keyMessage}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">Conceptual Steps:</h4>
                                             <Accordion type="single" collapsible className="w-full mt-2">
                                                {channelStrategy.conceptualSteps.map(step => (
                                                    <AccordionItem value={`step-${step.step}`} key={step.step}>
                                                        <AccordionTrigger>Step {step.step}: {step.objective}</AccordionTrigger>
                                                        <AccordionContent>
                                                            {step.concept}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">Success Metrics:</h4>
                                            <div className="space-y-1 mt-2">
                                            {channelStrategy.successMetrics.map((metric, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <p className="text-sm text-muted-foreground">{metric}</p>
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
                <Button variant="outline" onClick={() => setStep('selection')} disabled={isSaving}>Back</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Strategy'}
                </Button>
            </DialogFooter>
        </>
    );

    const renderContent = () => {
        switch (step) {
            case 'selection': return renderSelectionStep();
            case 'preview': return renderPreviewStep();
            default: return renderSelectionStep();
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         <Sparkles className="text-primary"/>
                        Create a New Strategy
                    </DialogTitle>
                    <DialogDescription>
                       Follow the steps to select a template, define your goal, and generate a tailored strategy blueprint.
                    </DialogDescription>
                </DialogHeader>
                
                {renderContent()}

            </DialogContent>
        </Dialog>
    );
}
