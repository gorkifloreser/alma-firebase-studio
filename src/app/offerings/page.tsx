
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
import { getOfferings, createOffering, translateText, Offering } from './actions';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { CreateOfferingDialog } from './_components/CreateOfferingDialog';

type Profile = {
    primary_language: string;
    secondary_language: string | null;
} | null;

export default function OfferingsPage() {
    const [profile, setProfile] = useState<Profile>(null);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const { toast } = useToast();

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const profileData = await getProfile();
            setProfile(profileData);
            
            const offeringsData = await getOfferings();
            setOfferings(offeringsData);

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
    }, [toast]);

    const handleOfferingCreated = () => {
        setIsDialogOpen(false);
        fetchAllData(); // Refetch offerings to show the new one
        toast({
            title: 'Success!',
            description: 'Your new offering has been created.',
        });
    };

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Offerings</h1>
                        <p className="text-muted-foreground">Manage your products, services, and events.</p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
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
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-4 w-full mb-2" />
                                        <Skeleton className="h-4 w-full" />
                                    </CardContent>
                                    <CardFooter>
                                        <Skeleton className="h-10 w-24" />
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : offerings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {offerings.map(offering => (
                                <Card key={offering.id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle>{offering.title.primary}</CardTitle>
                                        <CardDescription>{offering.type}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-muted-foreground line-clamp-3">
                                            {offering.description.primary}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <h3 className="text-xl font-semibold">No Offerings Yet</h3>
                            <p className="text-muted-foreground mt-2">Click "New Offering" to add your first product or service.</p>
                            <Button onClick={() => setIsDialogOpen(true)} className="mt-4 gap-2">
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
                onOfferingCreated={handleOfferingCreated}
            />
        </DashboardLayout>
    );
}
