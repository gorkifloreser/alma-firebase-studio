
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfile } from '@/app/settings/actions';
import { getOfferings, deleteOffering, Offering, OfferingMedia } from './actions';
import { PlusCircle, Edit, Trash2, MoreVertical } from 'lucide-react';
import { CreateOfferingDialog } from './_components/CreateOfferingDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleting, startDeleting] = useTransition();
    const [offeringToEdit, setOfferingToEdit] = useState<OfferingWithMedia | null>(null);
    
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
        setIsDialogOpen(true);
    };

    const handleOpenEditDialog = (offering: OfferingWithMedia) => {
        setOfferingToEdit(offering);
        setIsDialogOpen(true);
    };

    const handleOfferingSaved = () => {
        setIsDialogOpen(false);
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
                                <Card key={offering.id} className="flex flex-col">
                                    <CardHeader className="p-0">
                                        <div className="relative aspect-video">
                                            {offering.offering_media && offering.offering_media.length > 0 ? (
                                                <Image 
                                                    src={offering.offering_media[0].media_url}
                                                    alt={offering.title.primary || 'Offering image'}
                                                    fill
                                                    className="object-cover rounded-t-lg"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-secondary rounded-t-lg flex items-center justify-center">
                                                    <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                         <div className="flex justify-between items-start p-6 pb-2">
                                            <div>
                                                <CardTitle>{offering.title.primary}</CardTitle>
                                                <CardDescription>{offering.type}</CardDescription>
                                            </div>
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
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
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-muted-foreground line-clamp-3">
                                            {offering.description.primary}
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" size="sm">Generate Content</Button>
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
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                profile={profile}
                onOfferingSaved={handleOfferingSaved}
                offeringToEdit={offeringToEdit}
            />
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
