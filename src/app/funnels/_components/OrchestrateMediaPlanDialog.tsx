
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateFunnel, Funnel, generateMediaPlan as generateMediaPlanAction, regeneratePlanItem } from '../actions';
import { saveContent, Offering } from '@/app/offerings/actions';
import { Stars, Sparkles, RefreshCw, Trash2, PlusCircle, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ContentGenerationDialog } from '@/app/offerings/_components/ContentGenerationDialog';

interface OrchestrateMediaPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    funnel: Funnel;
    onPlanSaved: () => void;
    offerings: Offering[];
}

type PlanItemWithId = PlanItem & { id: string };
type RegeneratingState = { [itemId: string]: boolean };

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

export function OrchestrateMediaPlanDialog({
    isOpen,
    onOpenChange,
    funnel,
    onPlanSaved,
    offerings,
}: OrchestrateMediaPlanDialogProps) {
    const [planItems, setPlanItems] = useState<PlanItemWithId[]>([]);
    const [isGenerating, startGenerating] = useTransition();
    const [isSaving, startSaving] = useTransition();
    const [isRegenerating, setIsRegenerating] = useState<RegeneratingState>({});
    const { toast } = useToast();

    // State for the nested content generation dialog
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [offeringForContent, setOfferingForContent] = useState<Offering | null>(null);
    const [sourcePlanItem, setSourcePlanItem] = useState<PlanItem | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (funnel.media_plan) {
                validateAndSetPlanItems(funnel.media_plan);
            } else {
                setPlanItems([]);
            }
        }
    }, [isOpen, funnel]);

    const validateAndSetPlanItems = (items: PlanItem[]) => {
        const validatedItems = items.map(item => {
            const validFormats = getFormatsForChannel(item.channel);
            const formatIsValid = validFormats.includes(item.format);
            return {
                ...item,
                format: formatIsValid ? item.format : (validFormats[0] || 'Text Post'),
                id: crypto.randomUUID(),
            };
        });
        setPlanItems(validatedItems);
    };

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            try {
                const result = await generateMediaPlanAction({ funnelId: funnel.id });
                validateAndSetPlanItems(result.plan);
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
    };

    const handleSave = () => {
        startSaving(async () => {
            try {
                await updateFunnel(funnel.id, {
                    ...funnel,
                    funnelName: funnel.name,
                    presetId: funnel.preset_id,
                    offeringId: funnel.offering_id,
                    mediaPlan: planItems.map(({id, ...rest}) => rest),
                } as any);
                onPlanSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };
    
    const handleRegenerateItem = async (itemToRegen: PlanItemWithId) => {
        if (!itemToRegen.conceptualStep) return;
        setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: true }));
        try {
            const newItem = await regeneratePlanItem({ funnelId: funnel.id, channel: itemToRegen.channel, conceptualStep: itemToRegen.conceptualStep });
            const validFormats = getFormatsForChannel(newItem.channel);
            const formatIsValid = validFormats.includes(newItem.format);
            setPlanItems(prev => prev.map(item => item.id === itemToRegen.id ? { ...newItem, id: itemToRegen.id, format: formatIsValid ? newItem.format : (validFormats[0] || 'Text Post') } : item ));
            toast({ title: 'Item Regenerated!', description: 'The content idea has been updated.'});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Regeneration Failed', description: error.message });
        } finally {
            setIsRegenerating(prev => ({ ...prev, [itemToRegen.id]: false }));
        }
    };

    const handleItemChange = (itemId: string, field: 'format' | 'copy' | 'hashtags' | 'creativePrompt', value: string) => {
        setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    };

    const handleStageNameChange = (itemId: string, value: string) => {
        setPlanItems(prev => prev.map(item => {
            if (item.id === itemId && item.conceptualStep) {
                return { ...item, conceptualStep: { ...item.conceptualStep, stageName: value } };
            }
            return item;
        }));
    };

    const handleObjectiveChange = (itemId: string, value: string) => {
        setPlanItems(prev => prev.map(item => {
            if (item.id === itemId && item.conceptualStep) {
                return { ...item, conceptualStep: { ...item.conceptualStep, objective: value } };
            }
            return item;
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setPlanItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddNewItem = (channel: string) => {
        const newItem: PlanItemWithId = {
            id: crypto.randomUUID(),
            offeringId: funnel.offering_id || '',
            channel: channel,
            format: getFormatsForChannel(channel)[0] || 'Text Post',
            copy: '',
            hashtags: '',
            creativePrompt: '',
            conceptualStep: { objective: 'Your new objective here', stageName: 'Uncategorized' },
        };
        setPlanItems(prev => [...prev, newItem]);
    };

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
    
    const groupedByChannel = useMemo(() => {
        return planItems.reduce((acc, item) => {
            const channelKey = item.channel || 'General';
            if (!acc[channelKey]) acc[channelKey] = [];
            acc[channelKey].push(item);
            return acc;
        }, {} as Record<string, PlanItemWithId[]>);
    }, [planItems]);
    const channelsForTabs = Object.keys(groupedByChannel);

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Orchestrate Media Plan</DialogTitle>
                    <DialogDescription>Generate, edit, and approve the tactical content pieces for the '{funnel.name}' strategy.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] flex flex-col overflow-hidden py-4">
                    {isGenerating ? (
                        <div className="space-y-4 p-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
                    ) : planItems.length > 0 ? (
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
                                                <div className="space-y-1 pr-24">
                                                    <Label htmlFor={`stageName-${item.id}`}>Strategy Stage</Label>
                                                    <Input id={`stageName-${item.id}`} value={item.conceptualStep?.stageName || 'Uncategorized'} onChange={(e) => handleStageNameChange(item.id, e.target.value)} className="font-semibold bg-muted/50" readOnly />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`objective-${item.id}`}>Purpose / Objective</Label>
                                                    <Input id={`objective-${item.id}`} value={item.conceptualStep?.objective || ''} onChange={(e) => handleObjectiveChange(item.id, e.target.value)} placeholder="e.g., Build social proof"/>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`format-${item.id}`}>Format</Label>
                                                    <Select value={item.format} onValueChange={(v) => handleItemChange(item.id, 'format', v)}>
                                                        <SelectTrigger id={`format-${item.id}`} className="font-semibold"><SelectValue placeholder="Select a format" /></SelectTrigger>
                                                        <SelectContent>
                                                            {mediaFormatConfig.map(g => {
                                                                const channelFormats = g.formats.filter(f => f.channels.includes(item.channel.toLowerCase()));
                                                                if (channelFormats.length === 0) return null;
                                                                return (
                                                                    <SelectGroup key={g.label}>
                                                                        <SelectLabel>{g.label}</SelectLabel>
                                                                        {channelFormats.map(f => (<SelectItem key={f.value} value={f.value}>{f.value}</SelectItem>))}
                                                                    </SelectGroup>
                                                                )
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
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
                    ) : (
                        <div className="text-center text-muted-foreground py-10 flex-1 flex flex-col items-center justify-center">
                            <Stars className="h-12 w-12 mb-4" />
                            <h3 className="font-semibold text-lg">No media plan exists for this strategy yet.</h3>
                            <p>Click the button below to generate one with AI.</p>
                            <Button className="mt-6" onClick={handleGeneratePlan} disabled={isGenerating}>
                                Generate Media Plan
                            </Button>
                        </div>
                    )}
                </div>
                 <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isGenerating}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isGenerating || planItems.length === 0}>{isSaving ? 'Saving...' : 'Save Plan & Close'}</Button>
                </DialogFooter>
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
