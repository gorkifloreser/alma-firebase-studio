
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
import { Bot } from 'lucide-react';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
}

const funnelTypes: Funnel['funnel_type'][] = ['Awareness', 'Consideration', 'Conversion', 'Nurture'];

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    onFunnelCreated,
    defaultOfferingId,
}: CreateFunnelDialogProps) {
    const [selectedType, setSelectedType] = useState<Funnel['funnel_type'] | null>(null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(defaultOfferingId || null);
    const [isCreating, startCreating] = useTransition();
    const { toast } = useToast();
    
    const canSubmit = selectedType && selectedOfferingId;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        startCreating(async () => {
            try {
                await createFunnel(selectedType, selectedOfferingId);
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Funnel</DialogTitle>
                    <DialogDescription>
                        Select a funnel type and the offering you want to promote. The AI will generate the entire funnel for you.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="funnel-type" className="font-semibold">Step 1: Choose a Funnel Type</Label>
                        <Select onValueChange={(value) => setSelectedType(value as Funnel['funnel_type'])}>
                            <SelectTrigger id="funnel-type">
                                <SelectValue placeholder="Select a type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {funnelTypes.map(type => (
                                    <SelectItem key={type} value={type || ''}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="offering-select" className="font-semibold">Step 2: Choose an Offering</Label>
                         <Select onValueChange={setSelectedOfferingId} defaultValue={defaultOfferingId || undefined}>
                            <SelectTrigger id="offering-select">
                                <SelectValue placeholder="Select an offering..." />
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
