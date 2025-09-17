
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createFunnel, getFunnelPresets, FunnelPreset } from '../actions';
import { Offering } from '@/app/offerings/actions';
import { Bot, Gift, Zap, Users, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CreateFunnelDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    offerings: Offering[];
    onFunnelCreated: () => void;
    defaultOfferingId?: string | null;
    defaultFunnelType?: string | null;
}

const iconMap: { [key: string]: React.ElementType } = {
    'Lead Magnet': Gift,
    'Direct Offer': Zap,
    'Nurture & Convert': Users,
    'Onboarding & Habit': Repeat,
    'Sustainable Funnel': Bot,
    'Regenerative Funnel': Bot,
};

export function CreateFunnelDialog({
    isOpen,
    onOpenChange,
    offerings,
    onFunnelCreated,
    defaultOfferingId,
    defaultFunnelType,
}: CreateFunnelDialogProps) {
    const [funnelPresets, setFunnelPresets] = useState<FunnelPreset[]>([]);
    const [isLoadingPresets, setIsLoadingPresets] = useState(true);
    const [selectedType, setSelectedType] = useState<string | null>(defaultFunnelType || null);
    const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(defaultOfferingId || null);
    const [isCreating, startCreating] = useTransition();
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen) {
            setIsLoadingPresets(true);
            getFunnelPresets()
                .then(setFunnelPresets)
                .catch((err) => {
                     toast({
                        variant: 'destructive',
                        title: 'Failed to load presets',
                        description: err.message,
                    });
                })
                .finally(() => setIsLoadingPresets(false));
            
            setSelectedOfferingId(defaultOfferingId || null);
            setSelectedType(defaultFunnelType || null);
        }
    }, [isOpen, defaultOfferingId, defaultFunnelType, toast]);

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
    
    const PresetsSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-4 flex flex-col items-center text-center">
                        <Skeleton className="h-10 w-10 rounded-full mb-3" />
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-4 w-40 mb-3" />
                        <Skeleton className="h-3 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

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
                        {isLoadingPresets ? <PresetsSkeleton /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {funnelPresets.map((preset) => {
                                    const Icon = iconMap[preset.title] || Bot;
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
                                                Best for: {preset.best_for}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )})}
                            </div>
                        )}
                    </div>
                     <div className="space-y-4">
                        <Label htmlFor="offering-select" className="text-lg font-semibold">Step 2: Choose an Offering</Label>
                         <Select onValueChange={setSelectedOfferingId} defaultValue={defaultOfferingId || undefined} disabled={isCreating}>
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

    