

'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash, MoreVertical, Copy, User, Wand2, Lightbulb, BadgeHelp, TrendingUp, CircleDashed, Users, AlertTriangle, Sparkles, BrainCircuit, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

import type { ViralHook, getViralHooks, createViralHook, updateViralHook, deleteViralHook, rankViralHooks, getAdaptedHooks } from '../actions';
import type { AdaptedHook } from '@/ai/flows/adapt-viral-hooks-flow';


type RankedViralHook = ViralHook & {
    relevance_score?: number;
    virality_score?: number;
    justification?: string;
};

interface ViralHooksManagerProps {
    initialViralHooks: ViralHook[];
    actions: {
        getViralHooks: typeof getViralHooks;
        createViralHook: typeof createViralHook;
        updateViralHook: typeof updateViralHook;
        deleteViralHook: typeof deleteViralHook;
        rankViralHooks: typeof rankViralHooks;
        getAdaptedHooks: typeof getAdaptedHooks;
    }
}

const categoryIcons: { [key: string]: React.ElementType } = {
    'Curiosity': BadgeHelp,
    'Value': Lightbulb,
    'Shock': AlertTriangle,
    'Relatibility': Users,
    'FOMO': TrendingUp,
    'Default': CircleDashed,
};

const hookCategories = ['Curiosity', 'Value', 'Shock', 'Relatibility', 'FOMO'];

function HookDialog({ 
    isOpen, 
    onOpenChange, 
    onHookSaved, 
    hookToEdit, 
    createAction, 
    updateAction 
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onHookSaved: () => void;
    hookToEdit: ViralHook | null;
    createAction: typeof createViralHook;
    updateAction: typeof updateViralHook;
}) {
    const [formData, setFormData] = useState({ category: '', hook_text: '' });
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    React.useEffect(() => {
        if (hookToEdit) {
            setFormData({ category: hookToEdit.category, hook_text: hookToEdit.hook_text });
        } else {
            setFormData({ category: hookCategories[0], hook_text: '' });
        }
    }, [hookToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string, name?: string) => {
        if (typeof e === 'string') {
            setFormData(prev => ({ ...prev, [name || 'category']: e }));
        } else {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.category || !formData.hook_text) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill out both category and hook text.' });
            return;
        }

        startSaving(async () => {
            try {
                if (hookToEdit) {
                    await updateAction(hookToEdit.id, formData);
                } else {
                    await createAction(formData);
                }
                toast({ title: 'Success!', description: `Viral hook ${hookToEdit ? 'updated' : 'created'}.` });
                onHookSaved();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
            }
        });
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{hookToEdit ? 'Edit Viral Hook' : 'Create New Viral Hook'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" value={formData.category} onValueChange={(value) => handleChange(value, 'category')}>
                            <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                            <SelectContent>
                                {hookCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hook_text">Hook Text</Label>
                        <Textarea id="hook_text" name="hook_text" value={formData.hook_text} onChange={handleChange} placeholder="e.g., You won't believe what happens next..." rows={3}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Hook'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ViralHooksManager({ initialViralHooks, actions }: ViralHooksManagerProps) {
    const [hooks, setHooks] = useState<RankedViralHook[]>(initialViralHooks);
    const [topAdaptedHooks, setTopAdaptedHooks] = useState<AdaptedHook[] | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [hookToEdit, setHookToEdit] = useState<ViralHook | null>(null);
    const [isDeleting, startDeleting] = useTransition();
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();

    const handleDataRefresh = async () => {
        try {
            const freshHooks = await actions.getViralHooks();
            setHooks(freshHooks);
            setIsDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error refreshing hooks', description: error.message });
        }
    };
    
    const handleGenerateStrategy = () => {
        startGenerating(async () => {
            try {
                const result = await actions.getAdaptedHooks();
                setTopAdaptedHooks(result.topHooks);
                toast({ title: "Strategy Generated!", description: "The AI has created a custom Top 10 strategy for your brand."});
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Strategy Generation Failed', description: error.message });
            }
        });
    };

    const { globalHooks, customHooks } = useMemo(() => {
        const global = hooks.filter(h => h.user_id === null);
        const custom = hooks.filter(h => h.user_id !== null);
        return { globalHooks: global, customHooks: custom };
    }, [hooks]);

    const handleOpenDialog = (hook: ViralHook | null) => {
        setHookToEdit(hook);
        setIsDialogOpen(true);
    };
    
    const handleHookDelete = (hookId: number) => {
        startDeleting(async () => {
            try {
                await actions.deleteViralHook(hookId);
                toast({ title: 'Hook Deleted' });
                handleDataRefresh();
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
            }
        });
    };

    const HookCard = ({ hook, isCustom }: { hook: RankedViralHook, isCustom: boolean }) => {
        const Icon = categoryIcons[hook.category] || categoryIcons['Default'];
        return (
             <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-2 text-md">
                            <Icon className="h-4 w-4 text-muted-foreground"/> {hook.category}
                        </CardTitle>
                        {isCustom && <Badge variant="secondary" className="gap-1"><User className="h-3 w-3"/> Custom</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-lg font-medium">“{hook.hook_text}”</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                     {isCustom && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenDialog(hook)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <Trash className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleHookDelete(hook.id)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardFooter>
            </Card>
        )
    };


    const AdaptedHookCard = ({ hook }: { hook: AdaptedHook }) => (
        <Card className="bg-muted/30">
            <CardHeader>
                <div className="flex justify-between items-center">
                     <CardTitle className="text-lg">“{hook.adapted_hook}”</CardTitle>
                     <div className="flex gap-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-600/50">{hook.relevance_score}/10 Relevance</Badge>
                        <Badge variant="outline" className="text-green-600 border-green-600/50">{hook.virality_score}/10 Virality</Badge>
                     </div>
                </div>
                 <CardDescription>Original: "{hook.original_text}"</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible>
                    <AccordionItem value="strategy">
                        <AccordionTrigger>Storytelling Strategy</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">{hook.strategy}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="visual">
                        <AccordionTrigger>Visual Prompt</AccordionTrigger>
                        <AccordionContent className="text-sm font-mono text-muted-foreground bg-secondary p-2 rounded-md">{hook.visual_prompt}</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8">
             <header className="flex items-center justify-between">
                <div className="max-w-2xl">
                    <h2 className="text-2xl font-bold">Viral Hooks Library</h2>
                    <p className="text-muted-foreground mt-1">
                       Manage the hooks used by the AI to generate attention-grabbing content and get a custom strategy for your brand.
                    </p>
                </div>
                <div className="flex gap-2">
                     <Button onClick={handleGenerateStrategy} variant="outline" className="gap-2" disabled={isGenerating}>
                        {isGenerating ? <><BrainCircuit className="h-5 w-5 animate-spin" /> Generating...</> : <><BrainCircuit className="h-5 w-5"/> Generate Top 10 Strategy</>}
                    </Button>
                    <Button onClick={() => handleOpenDialog(null)} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        New Custom Hook
                    </Button>
                </div>
            </header>

            {isGenerating && <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>}
            
            {topAdaptedHooks && (
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                        Top 10 Hooks for Your Brand
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {topAdaptedHooks.map(hook => <AdaptedHookCard key={hook.original_id} hook={hook} />)}
                    </div>
                </div>
            )}
            
            <Separator />

             <>
                 <div>
                     <h3 className="text-xl font-semibold mb-4 border-b pb-2">Your Custom Hooks</h3>
                     {customHooks.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {customHooks.map(hook => <HookCard key={hook.id} hook={hook} isCustom={true} />)}
                        </div>
                     ) : (
                        <p className="text-muted-foreground text-center py-8">You haven't created any custom hooks yet.</p>
                     )}
                </div>

                 <div>
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Global Hooks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {globalHooks.map(hook => <HookCard key={hook.id} hook={hook} isCustom={false} />)}
                    </div>
                </div>
            </>


            <HookDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onHookSaved={handleDataRefresh}
                hookToEdit={hookToEdit}
                createAction={actions.createViralHook}
                updateAction={actions.updateViralHook}
            />
        </div>
    )

}
