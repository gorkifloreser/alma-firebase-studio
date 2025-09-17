

'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfile } from '@/app/settings/actions';
import { getOfferings, deleteOffering, Offering, OfferingMedia } from './actions';
import { PlusCircle, Edit, Trash2, MoreVertical, ShoppingBag, Wand2, Eye } from 'lucide-react';
import { CreateOfferingDialog } from './_components/CreateOfferingDialog';
import { OfferingDetailDialog } from './_components/OfferingDetailDialog';
import { ContentGenerationDialog } from './_components/ContentGenerationDialog';
import { FunnelGenerationDialog } from './_components/FunnelGenerationDialog';
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
import Image from 'next/image';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

const OfferingsPageContent = () => {
    const [profile, setProfile] = useState<Profile>(null);
    const [offerings, setOfferings] = useState<OfferingWithMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [isFunnelDialogOpen, setIsFunnelDialogOpen] = useState(false);
    const [isDeleting, startDeleting] = useTransition();
    const [offeringToEdit, setOfferingToEdit] = useState<OfferingWithMedia | null>(null);
    const [offeringToView, setOfferingToView] = useState<OfferingWithMedia | null>(null);
    const [offeringForContent, setOfferingForContent] = useState<OfferingWithMedia | null>(null);
    const [offeringForFunnel, setOfferingForFunnel] = useState<OfferingWithMedia | null>(null);
    const router = useRouter();
    
    const { toast } = useToast();

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const profileData = await getProfile();
            setProfile(profileData);
            
            const offeringsData = await getOfferings();
            setOfferings(offeringsData as OfferingWithMedia[]);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not fetch your data.',
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
            fetchAllData();
        };

        checkUserAndFetchData();
    }, []);

    const handleOpenCreateDialog = () => {
        setOfferingToEdit(null);
        setIsCreateDialogOpen(true);
    };

    const handleOpenEditDialog = (offering: OfferingWithMedia) => {
        setOfferingToEdit(offering);
        setIsCreateDialogOpen(true);
    };

    const handleOpenDetailDialog = (offering: OfferingWithMedia) => {
        setOfferingToView(offering);
        setIsDetailDialogOpen(true);
    };

    const handleOpenContentDialog = (offering: OfferingWithMedia) => {
        setOfferingForContent(offering);
        setIsContentDialogOpen(true);
    };
    
    const handleOpenFunnelDialog = (offering: OfferingWithMedia) => {
        setOfferingForFunnel(offering);
        setIsFunnelDialogOpen(true);
    };

    const handleOfferingSaved = () => {
        setIsCreateDialogOpen(false);
        fetchAllData();
        toast({
            title: 'Success!',
            description: `Your offering has been ${offeringToEdit ? 'updated' : 'created'}.`,
        });
    };

    const handleOfferingDelete = (offeringId: string) => {
        startDeleting(async () => {
            try {
                await deleteOffering(offeringId);
                toast({
                    title: 'Success!',
                    description: 'Your offering has been deleted.',
                });
                fetchAllData();
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: error.message,
                });
            }
        });
    }

    const handleViewFunnel = (offeringId: string) => {
        router.push(`/funnels/${offeringId}/edit`);
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Offerings</h1>
                        <p className="text-muted-foreground">Manage your products, services, and events.</p>
                    </div>
                    <Button onClick={handleOpenCreateDialog} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        New Offering
                    </Button>
                </header>

                <div>
                    {isLoading ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i}>
                                    <CardHeader>
                                        <Skeleton className="h-40 w-full" />
                                        <Skeleton className="h-6 w-3/4 mt-4" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-4 w-full mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : offerings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {offerings.map(offering => (
                                <Card key={offering.id} className="flex flex-col group">
                                     <div className="overflow-hidden cursor-pointer" onClick={() => handleOpenDetailDialog(offering)}>
                                        <CardHeader className="p-0">
                                            <div className="relative aspect-video">
                                                {offering.offering_media && offering.offering_media.length > 0 ? (
                                                    <Image 
                                                        src={offering.offering_media[0].media_url}
                                                        alt={offering.title.primary || 'Offering image'}
                                                        fill
                                                        className="object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-secondary rounded-t-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                                                        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-6">
                                            <CardTitle className="group-hover:text-primary transition-colors">{offering.title.primary}</CardTitle>
                                            <CardDescription>{offering.type}</CardDescription>
                                            <p className="text-muted-foreground line-clamp-3 mt-2">
                                                {offering.description.primary}
                                            </p>
                                        </CardContent>
                                    </div>
                                    <CardFooter className="mt-auto pt-0 flex justify-between items-center">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenContentDialog(offering)}>Generate Content</Button>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleOpenFunnelDialog(offering)}>
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    <span>Generate Funnel</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleViewFunnel(offering.id)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>View Funnel</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => handleOpenEditDialog(offering)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete your
                                                                offering and all associated media.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleOfferingDelete(offering.id!)}
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
                            <h3 className="text-xl font-semibold">No Offerings Yet</h3>
                            <p className="text-muted-foreground mt-2">Click "New Offering" to add your first product or service.</p>
                            <Button onClick={handleOpenCreateDialog} className="mt-4 gap-2">
                                <PlusCircle className="h-5 w-5" />
                                New Offering
                            </Button>
                        </div>
                    )}
                </div>
            </div>
             <CreateOfferingDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                profile={profile}
                onOfferingSaved={handleOfferingSaved}
                offeringToEdit={offeringToEdit}
            />
            {offeringToView && (
                <OfferingDetailDialog
                    isOpen={isDetailDialogOpen}
                    onOpenChange={setIsDetailDialogOpen}
                    offering={offeringToView}
                    profile={profile}
                />
            )}
            {offeringForContent && (
                <ContentGenerationDialog
                    isOpen={isContentDialogOpen}
                    onOpenChange={setIsContentDialogOpen}
                    offeringId={offeringForContent.id}
                    offeringTitle={offeringForContent.title.primary}
                />
            )}
             {offeringForFunnel && (
                <FunnelGenerationDialog
                    isOpen={isFunnelDialogOpen}
                    onOpenChange={setIsFunnelDialogOpen}
                    offeringId={offeringForFunnel.id}
                    offeringTitle={offeringForFunnel.title.primary}
                />
            )}
        </>
    );
}

export default function OfferingsPage() {
    return (
        <DashboardLayout>
            <Toaster />
            <OfferingsPageContent />
        </DashboardLayout>
    );
}
