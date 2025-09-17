

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
import { Bot, User, Stars, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { getProfile } from '@/app/settings/actions';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    funnelPresets: FunnelPreset[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
}

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

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
    const [generatedContent, setGeneratedContent] = useState<GenerateFunnelOutput | null>(null);
    const [profile, setProfile] = useState<Profile>(null);
    
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
            
            // Fetch profile to know about language settings
            getProfile().then(setProfile);
        }
    }, [isOpen, defaultOfferingId]);

    const canGenerate = selectedPresetId !== null && selectedOfferingId !== null;

    const handleGenerate = async () => {
        if (!canGenerate) return;

        startGenerating(async () => {
            try {
                const preset = funnelPresets.find(p => p.id === selectedPresetId);
                const offering = offerings.find(o => o.id === selectedOfferingId);
                if (!preset || !offering) throw new Error("Selected preset or offering not found.");

                const result = await generateFunnelPreview({
                    offeringId: selectedOfferingId!,
                    funnelType: preset.title,
                    funnelPrinciples: preset.principles,
                });
                
                setGeneratedContent(result);
                setFunnelName(`${offering.title.primary}: ${preset.title}`);
                setStep('preview');
                toast({
                    title: 'Preview Generated!',
                    description: 'Review and edit the generated content below.',
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
                description: 'Please ensure the funnel has a title and content before saving.',
            });
            return;
        }


        startSaving(async () => {
             try {
                await createFunnel({
                    presetId: selectedPresetId,
                    offeringId: selectedOfferingId,
                    funnelName: funnelName,
                    funnelContent: generatedContent,
                });
                onFunnelCreated();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Funnel Creation Failed',
                    description: error.message,
                });
            }
        });
    }

    const handleContentChange = (
      part: 'landingPage' | 'followUpSequence',
      lang: 'primary' | 'secondary',
      index: number | null, // index for follow-up steps
      field: 'title' | 'content',
      value: string
    ) => {
        setGeneratedContent(prev => {
            if (!prev) return null;
            const newContent = { ...prev };
            const targetLang = newContent[lang];

            if (targetLang) {
                if (part === 'landingPage') {
                    (targetLang.landingPage as any)[field] = value;
                } else if (part === 'followUpSequence' && index !== null) {
                    (targetLang.followUpSequence[index] as any)[field] = value;
                }
            }
            return newContent;
        });
    }

    const globalPresets = funnelPresets.filter(p => p.user_id === null);
    const customPresets = funnelPresets.filter(p => p.user_id !== null);

    const renderSelectionStep = () => (
        <>
            <div className="space-y-8 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div>
                    <Label className="text-lg font-semibold">Step 1: Choose a Funnel Template</Label>
                    
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
                </div>
                    <div className="space-y-4">
                    <Label htmlFor="offering-select" className="text-lg font-semibold">Step 2: Choose an Offering</Label>
                        <Select onValueChange={setSelectedOfferingId} defaultValue={defaultOfferingId || undefined} disabled={isGenerating}>
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
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                    {isGenerating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Preview</>}
                </Button>
            </DialogFooter>
        </>
    );

    const renderPreviewStep = () => (
         <>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                {!generatedContent ? (
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="funnelName" className="text-lg font-semibold">Funnel Title</Label>
                            <Input
                                id="funnelName"
                                value={funnelName}
                                onChange={(e) => setFunnelName(e.target.value)}
                                className="text-lg"
                            />
                        </div>
                        <Accordion type="multiple" defaultValue={['lp-primary', 'fu-primary']} className="w-full space-y-4">
                            {/* Primary Language Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Primary Language Content</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AccordionItem value="lp-primary">
                                        <AccordionTrigger>Landing Page</AccordionTrigger>
                                        <AccordionContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Title</Label>
                                                <Input
                                                    value={generatedContent.primary.landingPage.title}
                                                    onChange={(e) => handleContentChange('landingPage', 'primary', null, 'title', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Content</Label>
                                                <Textarea
                                                    value={generatedContent.primary.landingPage.content}
                                                    onChange={(e) => handleContentChange('landingPage', 'primary', null, 'content', e.target.value)}
                                                    rows={6}
                                                />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="fu-primary">
                                        <AccordionTrigger>Follow-Up Sequence</AccordionTrigger>
                                        <AccordionContent className="space-y-6">
                                            {generatedContent.primary.followUpSequence.map((step, index) => (
                                                <div key={index} className="space-y-4 p-4 border rounded-md">
                                                    <div className="space-y-2">
                                                        <Label>Step {index + 1} Title</Label>
                                                        <Input 
                                                            value={step.title}
                                                            onChange={(e) => handleContentChange('followUpSequence', 'primary', index, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Step {index + 1} Content</Label>
                                                        <Textarea 
                                                            value={step.content}
                                                            onChange={(e) => handleContentChange('followUpSequence', 'primary', index, 'content', e.target.value)}
                                                            rows={5}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                </CardContent>
                            </Card>

                            {/* Secondary Language Section */}
                            {generatedContent.secondary && profile?.secondary_language && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Secondary Language Content</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <AccordionItem value="lp-secondary">
                                            <AccordionTrigger>Landing Page</AccordionTrigger>
                                            <AccordionContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Title</Label>
                                                    <Input
                                                        value={generatedContent.secondary.landingPage.title}
                                                        onChange={(e) => handleContentChange('landingPage', 'secondary', null, 'title', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Content</Label>
                                                    <Textarea
                                                        value={generatedContent.secondary.landingPage.content}
                                                        onChange={(e) => handleContentChange('landingPage', 'secondary', null, 'content', e.target.value)}
                                                        rows={6}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="fu-secondary">
                                            <AccordionTrigger>Follow-Up Sequence</AccordionTrigger>
                                            <AccordionContent className="space-y-6">
                                                {generatedContent.secondary.followUpSequence.map((step, index) => (
                                                <div key={index} className="space-y-4 p-4 border rounded-md">
                                                    <div className="space-y-2">
                                                        <Label>Step {index + 1} Title</Label>
                                                        <Input
                                                            value={step.title}
                                                            onChange={(e) => handleContentChange('followUpSequence', 'secondary', index, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Step {index + 1} Content</Label>
                                                        <Textarea
                                                            value={step.content}
                                                            onChange={(e) => handleContentChange('followUpSequence', 'secondary', index, 'content', e.target.value)}
                                                            rows={5}
                                                        />
                                                    </div>
                                                </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </CardContent>
                                </Card>
                            )}
                        </Accordion>
                    </>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStep('selection')} disabled={isSaving}>Back</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Funnel'}
                </Button>
            </DialogFooter>
        </>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                         <Sparkles className="text-primary"/>
                        {step === 'selection' ? 'Create a New Magic Funnel' : 'Preview & Customize Funnel'}
                    </DialogTitle>
                    <DialogDescription>
                       {step === 'selection' 
                           ? "Select a strategic template, then choose the offering you want to promote. The AI will generate a tailored funnel for you."
                           : "Review the AI-generated content and make any edits before saving."
                       }
                    </DialogDescription>
                </DialogHeader>
                
                {step === 'selection' ? renderSelectionStep() : renderPreviewStep()}

            </DialogContent>
        </Dialog>
    );
}
