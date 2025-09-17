

'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getFunnels, deleteFunnel, Funnel, getFunnelPresets, FunnelPreset, deleteCustomFunnelPreset } from './actions';
import { getOfferings, Offering } from '../offerings/actions';
import { PlusCircle, GitBranch, Edit, Trash, MoreVertical, Copy, User } from 'lucide-react';
import { CreateFunnelDialog } from './_components/CreateFunnelDialog';
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
import { Separator } from '@/components/ui/separator';
import { CustomizePresetDialog } from './_components/CustomizePresetDialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function StrategiesPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [funnelPresets, setFunnelPresets] = useState<FunnelPreset[]>([]);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCustomizeDialogOpen, setIsCustomizeDialogOpen] = useState(false);
    const [presetToCustomize, setPresetToCustomize] = useState<FunnelPreset | null>(null);
    const [customizeMode, setCustomizeMode] = useState<'clone' | 'edit'>('clone');
    const [isDeleting, startDeleting] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const offeringIdFilter = useMemo(() => searchParams.get('offeringId'), [searchParams]);

    const { globalPresets, customPresets } = useMemo(() => {
        const global = funnelPresets.filter(p => p.user_id === null);
        const custom = funnelPresets.filter(p => p.user_id !== null);
        return { globalPresets: global, customPresets: custom };
    }, [funnelPresets]);


    const fetchFunnelsAndOfferings = async () => {
        setIsLoading(true);
        try {
            const [funnelsData, offeringsData, presetsData] = await Promise.all([
                getFunnels(offeringIdFilter ?? undefined),
                getOfferings(),
                getFunnelPresets(),
            ]);
            setFunnels(funnelsData);
            setOfferings(offeringsData);
            setFunnelPresets(presetsData);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
            fetchFunnelsAndOfferings();
        };
        checkUserAndFetchData();
    }, [offeringIdFilter]);

    const handleFunnelCreated = () => {
        setIsCreateDialogOpen(false);
        fetchFunnelsAndOfferings();
        toast({
            title: 'Success!',
            description: 'Your new funnel has been created and generated.',
        });
    };
    
    const handleFunnelDelete = (funnelId: string) => {
        startDeleting(async () => {
            try {
                await deleteFunnel(funnelId);
                toast({ title: 'Success!', description: 'The funnel has been deleted.' });
                fetchFunnelsAndOfferings();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    }

    const handleOpenCustomizeDialog = (preset: FunnelPreset, mode: 'clone' | 'edit') => {
        setPresetToCustomize(preset);
        setCustomizeMode(mode);
        setIsCustomizeDialogOpen(true);
    };

    const handlePresetSaved = () => {
        setIsCustomizeDialogOpen(false);
        fetchFunnelsAndOfferings();
    };
    
    const handlePresetDelete = (presetId: number) => {
        startDeleting(async () => {
            try {
                await deleteCustomFunnelPreset(presetId);
                toast({ title: 'Success!', description: 'The custom template has been deleted.' });
                fetchFunnelsAndOfferings();
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
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Strategies</h1>
                        <p className="text-muted-foreground">
                            Create, manage, and clone strategic marketing funnels.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        Create Strategy
                    </Button>
                </header>
                
                <Tabs defaultValue="my-funnels" className="w-full">
                    <div className="flex justify-center">
                        <TabsList>
                            <TabsTrigger value="templates">Strategy Templates</TabsTrigger>
                            <TabsTrigger value="my-funnels">My Strategies</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="templates" className="mt-6">
                        <div className="space-y-8">
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Skeleton className="h-48 w-full" />
                                    <Skeleton className="h-48 w-full" />
                                    <Skeleton className="h-48 w-full" />
                                </div>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="my-funnels" className="mt-6">
                         {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i}>
                                        <CardHeader>
                                            <Skeleton className="h-6 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </CardHeader>
                                        <CardContent>
                                            <Skeleton className="h-4 w-full" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : funnels.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {funnels.map(funnel => (
                                    <Card key={funnel.id} className="flex flex-col">
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
                                        <CardFooter className="mt-auto pt-4 flex justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => router.push(`/funnels/${funnel.id}/edit`)}>
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
                                                                    This will permanently delete the funnel and all its associated steps. This action cannot be undone.
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
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-xl font-semibold">No Strategies Yet</h3>
                                <p className="text-muted-foreground mt-2">
                                    Click 'Create Strategy' to generate your first one from a template.
                                </p>
                                <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4 gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    Create Strategy
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
            <CreateFunnelDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                offerings={offerings}
                funnelPresets={funnelPresets}
                onFunnelCreated={handleFunnelCreated}
                defaultOfferingId={offeringIdFilter}
            />
            <CustomizePresetDialog
                isOpen={isCustomizeDialogOpen}
                onOpenChange={setIsCustomizeDialogOpen}
                preset={presetToCustomize}
                mode={customizeMode}
                onPresetSaved={handlePresetSaved}
            />
        </DashboardLayout>
    );
}
