
'use client';

import { useState, useTransition } from 'react';
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
import { generateFunnelForOffering, saveFunnel } from '../actions';
import type { GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Sparkles } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelGenerationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offeringId: string | null;
  offeringTitle: string | null;
}

export function FunnelGenerationDialog({
  isOpen,
  onOpenChange,
  offeringId,
  offeringTitle,
}: FunnelGenerationDialogProps) {
  const [funnelContent, setFunnelContent] = useState<GenerateFunnelOutput | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!offeringId) return;

    startGenerating(async () => {
        setFunnelContent(null);
        try {
            const result = await generateFunnelForOffering({ offeringId });
            setFunnelContent(result);
            toast({
                title: 'Funnel Generated!',
                description: 'Review the landing page and follow-up sequence below.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Funnel Generation Failed',
                description: error.message,
            });
        }
    });
  };
  
  const handleSave = async () => {
    if (!offeringId || !funnelContent) return;

    startSaving(async () => {
        try {
            await saveFunnel(offeringId, funnelContent);
            toast({
                title: 'Funnel Saved!',
                description: 'You can now view and edit your funnel.',
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Save Funnel',
                description: error.message,
            });
        }
    });
  }

  const FunnelDisplay = ({ funnelData, lang }: { funnelData: GenerateFunnelOutput['primary'], lang: string }) => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Landing Page ({lang})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <h4 className="font-semibold text-lg">{funnelData.landingPage.title}</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{funnelData.landingPage.content}</p>
            </CardContent>
        </Card>
        
        <h3 className="text-xl font-bold">Follow-Up Sequence ({lang})</h3>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
            {funnelData.followUpSequence.map((step, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{step.title}</AccordionTrigger>
                    <AccordionContent className="whitespace-pre-wrap">
                        {step.content}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Magic Funnel Generator: <span className="font-bold">{offeringTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Generate a complete marketing funnel for your offering with one click.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-6 py-4">
            {isGenerating ? (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : funnelContent ? (
                <div className="space-y-8">
                   <FunnelDisplay funnelData={funnelContent.primary} lang="Primary"/>
                   {funnelContent.secondary && (
                        <div>
                            <hr className="my-8" />
                            <FunnelDisplay funnelData={funnelContent.secondary} lang="Secondary"/>
                        </div>
                   )}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        <Bot className="mr-2 h-5 w-5" />
                        Generate Funnel
                    </Button>
                </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isGenerating || isSaving || !funnelContent}>
            {isSaving ? 'Saving...' : 'Save Funnel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
