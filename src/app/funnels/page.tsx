
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
import { getFunnels, deleteFunnel, Funnel } from './actions';
import { PlusCircle, GitBranch, Edit, Trash, MoreVertical } from 'lucide-react';
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

export default function FunnelsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleting, startDeleting] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const offeringIdFilter = useMemo(() => searchParams.get('offeringId'), [searchParams]);

    const fetchFunnelsAndOfferings = async () => {
        setIsLoading(true);
        try {
            const [funnelsData, offeringsData] = await Promise.all([
                getFunnels(offeringIdFilter ?? undefined),
                getOfferings()
            ]);
            setFunnels(funnelsData);
            setOfferings(offeringsData);
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

    const filteredOfferingTitle = offeringIdFilter 
        ? offerings.find(o => o.id === offeringIdFilter)?.title.primary 
        : null;

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Funnels</h1>
                        <p className="text-muted-foreground">
                            {filteredOfferingTitle 
                                ? `Showing funnels for "${filteredOfferingTitle}"`
                                : "Manage your marketing funnels."
                            }
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        Create Funnel
                    </Button>
                </header>

                <div>
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
                                {offeringIdFilter ? "No funnels have been created for this offering yet." : "Click 'Create Funnel' to generate your first one."}
                            </p>
                            <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4 gap-2">
                                <PlusCircle className="h-5 w-5" />
                                Create Funnel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <CreateFunnelDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                offerings={offerings}
                onFunnelCreated={handleFunnelCreated}
                defaultOfferingId={offeringIdFilter}
            />
        </DashboardLayout>
    );
}
