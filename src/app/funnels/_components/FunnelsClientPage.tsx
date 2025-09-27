

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
import { PlusCircle, GitBranch, Edit, Trash, MoreVertical, Copy, User, Wand2 } from 'lucide-react';
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
import type { Funnel, FunnelPreset, getFunnels, deleteFunnel, getFunnelPresets, deleteCustomFunnelPreset } from '../actions';
import type { ViralHook, createViralHook, updateViralHook, deleteViralHook, rankViralHooks, getAdaptedHooks } from '@/app/viral-hooks/actions';


interface FunnelsClientPageProps {
    initialFunnels: Funnel[];
    initialFunnelPresets: FunnelPreset[];
    initialViralHooks: ViralHook[];
    offeringIdFilter: string | undefined;
    actions: {
        getFunnels: typeof getFunnels;
        deleteFunnel: typeof deleteFunnel;
        getFunnelPresets: typeof getFunnelPresets;
        deleteCustomFunnelPreset: typeof deleteCustomFunnelPreset;
        getViralHooks: typeof getViralHooks;
        createViralHook: typeof createViralHook;
        updateViralHook: typeof updateViralHook;
        deleteViralHook: typeof deleteViralHook;
        rankViralHooks: typeof rankViralHooks;
        getAdaptedHooks: typeof getAdaptedHooks;
    }
}

export function FunnelsClientPage({
    initialFunnels,
    initialFunnelPresets,
    initialViralHooks,
    offeringIdFilter,
    actions,
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
    const router = useRouter();
    const { toast } = useToast();

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
                toast({ title: 'Success!', description: 'The funnel has been deleted.' });
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
                                        This will permanently delete the '{preset.title}' template. This action cannot be undone.
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
                        Create, manage, and orchestrate strategic marketing funnels and viral hooks.
                    </p>
                </div>
                <Button onClick={handleOpenCreateDialog} className="gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Create Strategy
                </Button>
            </header>
            
            <Tabs defaultValue="my-strategies" className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="my-strategies">My AI Strategies</TabsTrigger>
                        <TabsTrigger value="viral-hooks">Viral Hooks Library</TabsTrigger>
                        <TabsTrigger value="templates">Strategy Templates</TabsTrigger>
                    </TabsList>
                </div>
                 <TabsContent value="viral-hooks" className="mt-6">
                    <ViralHooksManager
                        initialViralHooks={initialViralHooks}
                        actions={{
                            getViralHooks: actions.getViralHooks,
                            createViralHook: actions.createViralHook,
                            updateViralHook: actions.updateViralHook,
                            deleteViralHook: actions.deleteViralHook,
                            rankViralHooks: actions.rankViralHooks,
                            getAdaptedHooks: actions.getAdaptedHooks,
                        }}
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
                    {funnels.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {funnels.map(funnel => (
                                    <Card key={funnel.id} className="flex flex-col group">
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
                                        <CardFooter className="mt-auto pt-4 flex justify-between">
                                            <Button onClick={() => handleOpenOrchestrateDialog(funnel)}>
                                                <Wand2 className="mr-2 h-4 w-4" />
                                                Media Orchestrator
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
                                                                    This will permanently delete the funnel and all its associated content. This action cannot be undone.
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
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg col-span-full">
                            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="text-xl font-semibold">No Strategies Yet</h3>
                            <p className="text-muted-foreground mt-2">
                                Click 'Create Strategy' to generate your first one from a template.
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
