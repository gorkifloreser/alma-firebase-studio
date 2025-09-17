
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
import { getFunnels, deleteFunnel, Funnel, getFunnelPresets, FunnelPreset } from './actions';
import { PlusCircle, GitBranch, Edit, Trash, MoreVertical, Copy } from 'lucide-react';
import { CreateFunnelDialog } from './_components/CreateFunnelDialog';
import { getOfferings, Offering } from '../offerings/actions';
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
} from "@/components/ui/alert-dialog"
import { Separator } from '@/components/ui/separator';

export default function FunnelsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [funnelPresets, setFunnelPresets] = useState<FunnelPreset[]>([]);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleting, startDeleting] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // State for the clone functionality
    const [clonedFunnelType, setClonedFunnelType] = useState<string | null>(null);

    const offeringIdFilter = useMemo(() => searchParams.get('offeringId'), [searchParams]);

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

    const handleClonePreset = (funnelType: string) => {
        setClonedFunnelType(funnelType);
        setIsCreateDialogOpen(true);
    };

    const handleOpenCreateDialog = () => {
        setClonedFunnelType(null); // Ensure no preset is selected when creating from scratch
        setIsCreateDialogOpen(true);
    }

    const filteredOfferingTitle = offeringIdFilter 
        ? offerings.find(o => o.id === offeringIdFilter)?.title.primary 
        : null;

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Magic Funnels</h1>
                        <p className="text-muted-foreground">
                            Create, manage, and clone strategic marketing funnels.
                        </p>
                    </div>
                    <Button onClick={handleOpenCreateDialog} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        Create Funnel
                    </Button>
                </header>
                
                <div className="space-y-8">
                    {/* Funnel Presets Section */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-1">Funnel Templates</h2>
                        <p className="text-muted-foreground mb-4">
                            Clone a science-based template to create a new, customizable funnel for one of your offerings.
                        </p>
                        {isLoading ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Skeleton className="h-48 w-full" />
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {funnelPresets.map(preset => (
                                    <Card key={preset.id} className="flex flex-col bg-muted/20">
                                        <CardHeader>
                                            <CardTitle>{preset.title}</CardTitle>
                                            <CardDescription>{preset.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm">
                                                <span className="font-semibold">Best for:</span> {preset.best_for}
                                            </p>
                                        </CardContent>
                                        <CardFooter>
                                            <Button variant="outline" size="sm" onClick={() => handleClonePreset(preset.type)}>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Clone & Customize
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <Separator />
                    
                    {/* User's Funnels Section */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Your Funnels</h2>
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
                                                Type: <span className="font-medium text-foreground">{funnel.funnel_type || 'General'}</span>
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
                                                        <span>Edit Landing Page</span>
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
                                <h3 className="mt-4 text-xl font-semibold">No Funnels Yet</h3>
                                <p className="text-muted-foreground mt-2">
                                    {offeringIdFilter ? "No funnels have been created for this offering yet." : "Clone a template or click 'Create Funnel' to generate your first one."}
                                </p>
                                <Button onClick={handleOpenCreateDialog} className="mt-4 gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    Create Funnel
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CreateFunnelDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                offerings={offerings}
                onFunnelCreated={handleFunnelCreated}
                defaultOfferingId={offeringIdFilter}
                defaultFunnelType={clonedFunnelType}
            />
        </DashboardLayout>
    );
}

    
