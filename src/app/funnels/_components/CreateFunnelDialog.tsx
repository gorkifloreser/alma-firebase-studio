
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFunnel, Funnel } from '../actions';
import { Offering } from '@/app/offerings/actions';
import { Bot, Zap, Gift, Users, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
}

const funnelPresets = [
    {
        type: 'Lead Magnet',
        icon: Gift,
        title: 'The Lead Magnet',
        description: 'Offer a free resource (e.g., guide, workshop) to capture leads.',
        bestFor: 'Building an email list or audience.',
        principles: 'Reciprocity, Commitment',
    },
    {
        type: 'Direct Offer',
        icon: Zap,
        title: 'The Direct Offer',
        description: 'Drive immediate sales for a specific product or event.',
        bestFor: 'One-time purchases, event tickets, or limited-time offers.',
        principles: 'Scarcity, Social Proof',
    },
    {
        type: 'Nurture & Convert',
        icon: Users,
        title: 'The Nurture & Convert',
        description: 'Build trust and authority with a value-driven sequence.',
        bestFor: 'High-ticket services, coaching, or complex products.',
        principles: 'Liking, Authority',
    },
    {
        type: 'Onboarding & Habit',
        icon: Repeat,
        title: 'The Onboarding & Habit',
        description: 'Guide new users to their "aha!" moment and encourage retention.',
        bestFor: 'SaaS, memberships, and recurring subscription services.',
        principles: 'The Hook Model',
    },
];

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    onFunnelCreated,
    defaultOfferingId,
}: CreateFunnelDialogProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(defaultOfferingId || null);
    const [isCreating, startCreating] = useTransition();
    const { toast } = useToast();
    
    const canSubmit = selectedType && selectedOfferingId;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        startCreating(async () => {
            try {
                await createFunnel(selectedType as any, selectedOfferingId);
                onFunnelCreated();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Funnel Creation Failed',
                    description: error.message,
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create a New Magic Funnel</DialogTitle>
                    <DialogDescription>
                       Select a science-based funnel model, then choose the offering you want to promote.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-8 py-4 max-h-[70vh] overflow-y-auto pr-6">
                    <div>
                        <Label className="text-lg font-semibold">Step 1: Choose a Funnel Model</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {funnelPresets.map((preset) => {
                                const Icon = preset.icon;
                                return (
                                <Card 
                                    key={preset.type} 
                                    className={cn(
                                        "cursor-pointer transition-all",
                                        selectedType === preset.type 
                                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                                            : "hover:bg-muted/50"
                                    )}
                                    onClick={() => setSelectedType(preset.type)}
                                >
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className="bg-primary/10 p-3 rounded-full mb-3">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="font-bold">{preset.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                                        <p className="text-xs text-primary font-semibold mt-3">
                                            Best for: {preset.bestFor}
                                        </p>
                                    </CardContent>
                                </Card>
                            )})}
                        </div>
                    </div>
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || isCreating}>
                        {isCreating ? 'Generating...' : <><Bot className="mr-2 h-4 w-4" /> Generate Funnel</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
