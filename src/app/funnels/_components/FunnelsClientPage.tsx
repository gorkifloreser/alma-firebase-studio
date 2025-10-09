// @functional: This component and its related features (funnels, presets, media orchestration) are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-10-02

// @functional: This component and its related features (funnels, presets, media orchestration) are considered functionally complete.
// Avoid unnecessary modifications unless a new feature or bug fix is explicitly requested for this area.
// Last verified: 2025-09-22

'use client';

import * as React from 'react';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, GitBranch, Edit, Trash, MoreVertical, Copy, User, Wand2, LayoutGrid, Rows, ChevronsRight, BrainCircuit, Star, Save } from 'lucide-react';
import { CreateFunnelDialog } from './CreateFunnelDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CustomizePresetDialog } from './CustomizePresetDialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrchestrateMediaPlanDialog } from './OrchestrateMediaPlanDialog';
import { ViralHooksManager } from '@/app/viral-hooks/_components/ViralHooksManager';
import type { Funnel, FunnelPreset, getFunnels, deleteFunnel, getFunnelPresets, deleteCustomFunnelPreset, ValueStrategy, AdaptedValueStrategy } from '../actions';
import type { ViralHook, createViralHook, updateViralHook, deleteViralHook, rankViralHooks, getAdaptedHooks, generateAndGetAdaptedHooks, createAdaptedHook, updateAdaptedHook, deleteAdaptedHook, getViralHooks } from '@/app/viral-hooks/actions';
import type { AdaptedHook } from '@/ai/flows/adapt-viral-hooks-flow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';


interface FunnelsClientPageProps {
    initialFunnels: Funnel[];
    initialFunnelPresets: FunnelPreset[];
    initialViralHooks: ViralHook[];
    initialAdaptedHooks: AdaptedHook[];
    initialValueStrategies: ValueStrategy[];
    initialAdaptedValueStrategies: AdaptedValueStrategy[];
    offeringIdFilter: string | undefined;
    getViralHooks: typeof getViralHooks;
    actions: {
        getFunnels: typeof getFunnels;
        deleteFunnel: typeof deleteFunnel;
        getFunnelPresets: typeof getFunnelPresets;
        deleteCustomFunnelPreset: typeof deleteCustomFunnelPreset;
        createViralHook: typeof createViralHook;
        updateViralHook: typeof updateViralHook;
        deleteViralHook: typeof deleteViralHook;
        rankViralHooks: typeof rankViralHooks;
        getAdaptedHooks: typeof getAdaptedHooks;
        generateAndGetAdaptedHooks: typeof generateAndGetAdaptedHooks;
        createAdaptedHook: typeof createAdaptedHook;
        updateAdaptedHook: typeof updateAdaptedHook;
        deleteAdaptedHook: typeof deleteAdaptedHook;
        generateAndGetAdaptedValueStrategies: () => Promise<{ topStrategies: AdaptedValueStrategy[] }>;
    }
}

const ValueStrategyCard = ({ strategy }: { strategy: ValueStrategy }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <Badge variant="secondary" className="w-fit">{strategy.virality_axis}</Badge>
                <CardTitle className="mt-2">{strategy.content_method}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div>
                    <h4 className="font-semibold text-sm">Value Purpose</h4>
                    <p className="text-muted-foreground text-sm">{strategy.value_purpose}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm">Practical Example</h4>
                    <p className="text-muted-foreground text-sm italic">"{strategy.practical_example}"</p>
                </div>
            </CardContent>
        </Card>
    );
};

const AdaptedValueStrategyCard = ({
    strategy,
    isSaving,
    isDeleting,
    isDirty,
    onFieldChange,
    onSave,
    onDelete,
}: {
    strategy: AdaptedValueStrategy;
    isSaving: boolean;
    isDeleting: boolean;
    isDirty: boolean;
    onFieldChange: (field: keyof AdaptedValueStrategy, value: string) => void;
    onSave: () => void;
    onDelete: () => void;
}) => (
    <Card className="bg-muted/30">
        <CardHeader>
            <div className="flex justify-between items-start">
                <Textarea
                    value={strategy.adapted_method}
                    onChange={e => onFieldChange('adapted_method', e.target.value)}
                    className="text-lg font-bold border-0 focus-visible:ring-1 focus-visible:ring-primary p-1 -ml-1 resize-none"
                />
                <div className="flex gap-2 flex-shrink-0 ml-4">
                    <Badge variant="outline" className="text-blue-600 border-blue-600/50">{strategy.relevance_score}/10 Relevance</Badge>
                </div>
            </div>
            <CardDescription>Original: "{strategy.original_method}"</CardDescription>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible defaultValue="strategy">
                <AccordionItem value="strategy">
                    <AccordionTrigger>Actionable Strategy</AccordionTrigger>
                    <AccordionContent>
                        <Textarea
                            value={strategy.strategy}
                            onChange={e => onFieldChange('strategy', e.target.value)}
                            className="text-sm text-muted-foreground w-full"
                            rows={3}
                        />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="visual">
                    <AccordionTrigger>Visual Prompt</AccordionTrigger>
                    <AccordionContent>
                        <Textarea
                            value={strategy.visual_prompt}
                            onChange={e => onFieldChange('visual_prompt', e.target.value)}
                            className="text-sm font-mono text-muted-foreground bg-secondary w-full"
                            rows={4}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete this adapted strategy?</AlertDialogTitle><AlertDialogDescription>This will permanently remove this strategy from your list.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {isDirty && <Button size="sm" onClick={onSave} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}</Button>}
        </CardFooter>
    </Card>
);

export function FunnelsClientPage({
    initialFunnels,
    initialFunnelPresets,
    initialViralHooks,
    initialAdaptedHooks,
    initialValueStrategies,
    initialAdaptedValueStrategies,
    offeringIdFilter,
    actions,
    getViralHooks,
}: FunnelsClientPageProps) {
    const [funnels, setFunnels] = useState(initialFunnels);
    const [funnelPresets, setFunnelPresets] = useState(initialFunnelPresets);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isOrchestrateDialogOpen, setIsOrchestrateDialogOpen] = useState(false);
    const [funnelToEdit, setFunnelToEdit] = useState<Funnel | null>(null);
    const [funnelToOrchestrate, setFunnelToOrchestrate] = useState<Funnel | null>(null);
    const [isCustomizeDialogOpen, setIsCustomizeDialogOpen] = useState(false);
    const [presetToCustomize, setPresetToCustomize] = useState<FunnelPreset | null>(null);
    const [customizeMode, setCustomizeMode] = useState<'clone' | 'edit'>('clone');
    const [isDeleting, startDeleting] = useTransition();
    const [strategyView, setStrategyView] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState('my-strategies');
    
    // State for Value Strategies
    const [adaptedValueStrategies, setAdaptedValueStrategies] = useState(initialAdaptedValueStrategies);
    const [isGeneratingValueStrategies, startGeneratingValueStrategies] = useTransition();
    const [dirtyAdaptedValueStrategies, setDirtyAdaptedValueStrategies] = useState<Set<number>>(new Set());

    const router = useRouter();
    const { toast } = useToast();

     useEffect(() => {
        const savedView = localStorage.getItem('strategy-view');
        if (savedView === 'grid' || savedView === 'list') {
            setStrategyView(savedView);
        }
        const savedTab = localStorage.getItem('ai-strategist-tab');
        if (savedTab) {
            setActiveTab(savedTab);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('strategy-view', strategyView);
    }, [strategyView]);

     useEffect(() => {
        localStorage.setItem('ai-strategist-tab', activeTab);
    }, [activeTab]);


    const { globalPresets, customPresets } = useMemo(() => {
        const global = funnelPresets.filter(p => p.user_id === null);
        const custom = funnelPresets.filter(p => p.user_id !== null);
        return { globalPresets: global, customPresets: custom };
    }, [funnelPresets]);


    const handleDataRefresh = async () => {
        try {
            const [funnelsData, presetsData] = await Promise.all([
                actions.getFunnels(offeringIdFilter),
                actions.getFunnelPresets(),
            ]);
            setFunnels(funnelsData);
            setFunnelPresets(presetsData);
            return funnelsData; // Return the new funnels data
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error refreshing data',
                description: error.message,
            });
            return funnels; // Return old data on error
        }
    };

    const handleFunnelSaved = () => {
        setIsCreateDialogOpen(false);
        setFunnelToEdit(null);
        handleDataRefresh();
        toast({
            title: 'Success!',
            description: 'Your strategy has been saved.',
        });
    };
    
    const handleFunnelDelete = (funnelId: string) => {
        startDeleting(async () => {
            try {
                await actions.deleteFunnel(funnelId);
                toast({ title: 'Success!', description: 'The strategy has been deleted.' });
                handleDataRefresh();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    }
    
    const handleOpenCreateDialog = () => {
        setFunnelToEdit(null);
        setIsCreateDialogOpen(true);
    };

    const handleOpenEditDialog = (funnel: Funnel) => {
        setFunnelToEdit(funnel);
        setIsCreateDialogOpen(true);
    };

     const handleOpenOrchestrateDialog = (funnel: Funnel) => {
        setFunnelToOrchestrate(funnel);
        setIsOrchestrateDialogOpen(true);
    };

    const handleOpenCustomizeDialog = (preset: FunnelPreset, mode: 'clone' | 'edit') => {
        setPresetToCustomize(preset);
        setCustomizeMode(mode);
        setIsCustomizeDialogOpen(true);
    };

    const handlePresetSaved = () => {
        setIsCustomizeDialogOpen(false);
        handleDataRefresh();
    };
    
    const handlePresetDelete = (presetId: number) => {
        startDeleting(async () => {
            try {
                await actions.deleteCustomFunnelPreset(presetId);
                toast({ title: 'Success!', description: 'The custom template has been deleted.' });
                handleDataRefresh();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    };
    
    const handleGenerateValueStrategy = () => {
        startGeneratingValueStrategies(async () => {
            try {
                const result = await actions.generateAndGetAdaptedValueStrategies();
                setAdaptedValueStrategies(result.topStrategies);
                toast({ title: "Value Strategy Generated!", description: "The AI has created a custom Top 10 value strategy for your brand."});
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Value Strategy Generation Failed', description: error.message });
            }
        });
    };

    const PresetCard = ({ preset, isCustom }: { preset: FunnelPreset, isCustom: boolean }) => (
        <Card className="flex flex-col bg-muted/20">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{preset.title}</CardTitle>
                    {isCustom && <Badge variant="secondary" className="gap-1"><User className="h-3 w-3"/> Custom</Badge>}
                </div>
                <CardDescription>{preset.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm">
                    <span className="font-semibold">Best for:</span> {preset.best_for}
                </p>
            </CardContent>
            <CardFooter className="flex justify-end items-center gap-2">
                 {isCustom ? (
                    <>
                        <Button variant="outline" size="sm" onClick={() => handleOpenCustomizeDialog(preset, 'edit')}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this custom template?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the "{preset.title}" template. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handlePresetDelete(preset.id)}
                                        disabled={isDeleting}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => handleOpenCustomizeDialog(preset, 'clone')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone & Customize
                    </Button>
                )}
            </CardFooter>
        </Card>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">AI Strategist</h1>
                    <p className="text-muted-foreground">
                        Create, manage, and orchestrate strategic marketing strategies and viral hooks.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Create Strategy
                </Button>
            </header>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="my-strategies">My AI Strategies</TabsTrigger>
                        <TabsTrigger value="viral-hooks">Viral Hooks Library</TabsTrigger>
                        <TabsTrigger value="value-strategies">Value Strategies</TabsTrigger>
                        <TabsTrigger value="templates">Strategy Templates</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="value-strategies" className="mt-6">
                     <div className="space-y-8">
                        <header className="flex items-center justify-between">
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold">Adapted Value Strategies</h2>
                                <p className="text-muted-foreground mt-1">
                                   Your Top 10 value strategies, personalized by the AI for your brand.
                                </p>
                            </div>
                            <Button onClick={handleGenerateValueStrategy} variant="outline" className="gap-2" disabled={isGeneratingValueStrategies}>
                                {isGeneratingValueStrategies ? <><BrainCircuit className="h-5 w-5 animate-spin" /> Generating...</> : <><BrainCircuit className="h-5 w-5"/> Generate Top 10 Value Strategy</>}
                            </Button>
                        </header>
                         {(adaptedValueStrategies && adaptedValueStrategies.length > 0) && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                                    Top 10 Value Strategies for Your Brand
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {adaptedValueStrategies.map(strategy => 
                                        <AdaptedValueStrategyCard 
                                            key={strategy.id} 
                                            strategy={strategy} 
                                            isSaving={false}
                                            isDeleting={false}
                                            isDirty={false}
                                            onFieldChange={() => {}}
                                            onSave={() => {}}
                                            onDelete={() => {}}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        <Separator />
                        <h2 className="text-2xl font-bold pt-4">Global Value Strategy Library</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {initialValueStrategies.map(strategy => (
                                <ValueStrategyCard key={strategy.id} strategy={strategy} />
                            ))}
                        </div>
                    </div>
                </TabsContent>
                 <TabsContent value="viral-hooks" className="mt-6">
                    <ViralHooksManager
                        initialViralHooks={initialViralHooks}
                        initialAdaptedHooks={initialAdaptedHooks}
                        actions={{...actions, getViralHooks}}
                    />
                </TabsContent>
                <TabsContent value="templates" className="mt-6">
                    <div className="space-y-8">
                        {customPresets.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Your Custom Templates</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {customPresets.map(preset => <PresetCard key={preset.id} preset={preset} isCustom={true} />)}
                                </div>
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Global Templates</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {globalPresets.map(preset => <PresetCard key={preset.id} preset={preset} isCustom={false} />)}
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="my-strategies" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={strategyView === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setStrategyView('grid')}><LayoutGrid className="h-4 w-4"/></Button>
                            <Button variant={strategyView === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setStrategyView('list')}><Rows className="h-4 w-4"/></Button>
                        </div>
                    </div>
                    {funnels.length > 0 ? (
                        <>
                            <div className={strategyView === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                                {funnels.map(funnel => (
                                    <Card key={funnel.id} className="flex flex-col group">
                                         <div className={strategyView === 'list' ? 'flex justify-between items-center' : ''}>
                                            <div className="flex-1">
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <CardTitle className="text-xl">{funnel.name}</CardTitle>
                                                            <CardDescription>
                                                                For: {funnel.offerings?.title.primary || 'N/A'}
                                                            </CardDescription>
                                                        </div>
                                                        <GitBranch className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                    <p className="text-sm text-muted-foreground">
                                                        Type: <span className="font-medium text-foreground">{funnelPresets.find(p=> p.id === funnel.preset_id)?.title || 'General'}</span>
                                                    </p>
                                                </CardContent>
                                            </div>
                                            <CardFooter className="mt-auto pt-4 flex justify-end gap-2">
                                                <Button onClick={() => handleOpenOrchestrateDialog(funnel)}>
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    Campaign Orchestrator
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenEditDialog(funnel)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Edit Strategy</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete the strategy and all its associated content. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleFunnelDelete(funnel.id)}
                                                                        disabled={isDeleting}
                                                                        className="bg-destructive hover:bg-destructive/90"
                                                                    >
                                                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </CardFooter>
                                         </div>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg col-span-full">
                            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">No Strategies Yet</h3>
                            <p className="text-muted-foreground mt-2">
                                Click "Create Strategy" to generate your first one from a template.
                            </p>
                            <Button onClick={handleOpenCreateDialog} className="mt-4 gap-2">
                                <PlusCircle className="h-5 w-5" />
                                Create Strategy
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            <CreateFunnelDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={(open) => {
                    if (!open) setFunnelToEdit(null);
                    setIsCreateDialogOpen(open);
                }}
                funnelPresets={funnelPresets}
                onFunnelSaved={handleFunnelSaved}
                funnelToEdit={funnelToEdit}
            />
             {isOrchestrateDialogOpen && funnelToOrchestrate && (
                <OrchestrateMediaPlanDialog
                    isOpen={isOrchestrateDialogOpen}
                    onOpenChange={setIsOrchestrateDialogOpen}
                    funnel={funnelToOrchestrate}
                    onPlanSaved={async (newFunnelData) => {
                        await handleDataRefresh();
                        setFunnelToOrchestrate(newFunnelData);
                    }}
                />
            )}
            <CustomizePresetDialog
                isOpen={isCustomizeDialogOpen}
                onOpenChange={setIsCustomizeDialogOpen}
                preset={presetToCustomize}
                mode={customizeMode}
                onPresetSaved={handlePresetSaved}
            />
        </div>
    );
}
