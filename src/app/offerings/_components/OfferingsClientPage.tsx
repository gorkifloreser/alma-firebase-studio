

'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, MoreVertical, ShoppingBag, GitBranch, Copy, BookHeart, LayoutGrid, Calendar } from 'lucide-react';
import { CreateOfferingDialog } from './CreateOfferingDialog';
import { OfferingDetailDialog } from './OfferingDetailDialog';
import { CreateEventInstanceDialog } from './CreateEventInstanceDialog';
import { EditEventInstanceDialog } from './EditEventInstanceDialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { Offering, OfferingMedia, OfferingSchedule } from '../actions';
import type { getOfferings, deleteOffering } from '../actions';
import type { Funnel } from '@/app/funnels/actions';
import type { getProfile } from '@/app/settings/actions';
import { EventCalendarView } from './EventCalendarView';


type Profile = Awaited<ReturnType<typeof getProfile>>;
type OfferingWithMedia = Offering & { offering_media: OfferingMedia[] };

interface OfferingsClientPageProps {
    initialOfferings: OfferingWithMedia[];
    initialFunnels: Funnel[];
    profile: Profile;
    actions: {
        getOfferings: typeof getOfferings;
        deleteOffering: typeof deleteOffering;
        [key: string]: Function; // for other actions
    }
}

export function OfferingsClientPage({ initialOfferings, initialFunnels, profile, actions }: OfferingsClientPageProps) {
    const [offerings, setOfferings] = useState(initialOfferings);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
    const [isEditInstanceDialogOpen, setIsEditInstanceDialogOpen] = useState(false);
    const [isDeleting, startDeleting] = useTransition();
    const [offeringToEdit, setOfferingToEdit] = useState<OfferingWithMedia | null>(null);
    const [offeringToView, setOfferingToView] = useState<OfferingWithMedia | null>(null);
    const [scheduleToEdit, setScheduleToEdit] = useState<OfferingSchedule | null>(null);
    const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
    const [activeTab, setActiveTab] = useState('all');
    const [eventView, setEventView] = useState<'grid' | 'calendar'>('grid');
    const router = useRouter();
    const { toast } = useToast();

    // Effect to read from localStorage on initial client-side render
    useEffect(() => {
        const savedTab = localStorage.getItem('offerings-active-tab');
        if (savedTab) {
            setActiveTab(savedTab);
        }
        const savedEventView = localStorage.getItem('offerings-event-view');
        if (savedEventView === 'grid' || savedEventView === 'calendar') {
            setEventView(savedEventView);
        }
    }, []);

    // Effect to save to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('offerings-active-tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('offerings-event-view', eventView);
    }, [eventView]);

    const fetchOfferings = async () => {
        try {
            const offeringsData = await actions.getOfferings();
            setOfferings(offeringsData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error refreshing offerings', description: error.message });
        }
    };

    const handleOpenCreateDialog = (date?: Date) => {
        setOfferingToEdit(null);
        setPreselectedDate(date);
        setIsCreateDialogOpen(true);
    };

    const handleOpenInstanceDialog = (date: Date) => {
        setPreselectedDate(date);
        setIsInstanceDialogOpen(true);
    };

    const handleOpenEditDialog = (offering: OfferingWithMedia) => {
        setOfferingToEdit(offering);
        setPreselectedDate(undefined);
        setIsCreateDialogOpen(true);
    };
    
    const handleOpenCloneDialog = (offering: OfferingWithMedia) => {
        const clonedOffering = {
            ...offering,
            id: undefined, // Remove ID to indicate it's a new offering
            title: {
                ...offering.title,
                primary: `${offering.title.primary} (Copy)`
            }
        };
        setOfferingToEdit(clonedOffering as OfferingWithMedia);
        setPreselectedDate(undefined);
        setIsCreateDialogOpen(true);
    };

    const handleOpenDetailDialog = (offering: OfferingWithMedia) => {
        setOfferingToView(offering);
        setIsDetailDialogOpen(true);
    };

    const handleOpenEditInstanceDialog = (offeringId: string, scheduleId: string) => {
        const offering = offerings.find(o => o.id === offeringId);
        if (offering) {
            const schedule = offering.offering_schedules.find(s => s.id === scheduleId);
            if (schedule) {
                setOfferingToEdit(offering); // Set the parent offering for context
                setScheduleToEdit(schedule);
                setIsEditInstanceDialogOpen(true);
            }
        }
    };


    const handleOfferingSaved = () => {
        setIsCreateDialogOpen(false);
        fetchOfferings();
        toast({
            title: 'Success!',
            description: `Your offering has been ${offeringToEdit ? 'updated' : 'created'}.`,
        });
    };
    
    const handleEventInstanceCreated = () => {
        setIsInstanceDialogOpen(false);
        fetchOfferings();
        toast({
            title: 'Success!',
            description: 'A new date has been added to your event offering.',
        });
    };

    const handleEventInstanceUpdated = () => {
        setIsEditInstanceDialogOpen(false);
        fetchOfferings();
        toast({ title: 'Success!', description: 'The event date has been updated.' });
    };


    const handleOfferingDelete = (offeringId: string) => {
        startDeleting(async () => {
            try {
                await actions.deleteOffering(offeringId);
                toast({ title: 'Success!', description: 'Your offering has been deleted.' });
                setIsDetailDialogOpen(false); // Close detail dialog if open
                fetchOfferings();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
            }
        });
    }

    const handleManageFunnels = (offeringId: string) => {
        router.push(`/funnels?offeringId=${offeringId}`);
    }

    const { filteredOfferings, eventTemplates } = useMemo(() => {
        const events = offerings.filter(o => o.type === 'Event');
        const filtered = offerings.filter(offering => {
            if (activeTab === 'all') return true;
            if (activeTab === 'value-content') return offering.type === 'Value Content';
            return offering.type.toLowerCase() === activeTab;
        });
        return { filteredOfferings: filtered, eventTemplates: events };
    }, [offerings, activeTab]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Offerings</h1>
                    <p className="text-muted-foreground">Manage your products, services, and events.</p>
                </div>
                <Button onClick={() => handleOpenCreateDialog()} className="gap-2">
                    <PlusCircle className="h-5 w-5" />
                    New Offering
                </Button>
            </header>

            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                 <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="service">Services</TabsTrigger>
                        <TabsTrigger value="product">Products</TabsTrigger>
                        <TabsTrigger value="event">Events</TabsTrigger>
                        <TabsTrigger value="value-content">Value Content</TabsTrigger>
                    </TabsList>

                    {activeTab === 'event' && (
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={eventView === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setEventView('grid')}><LayoutGrid className="h-4 w-4"/></Button>
                            <Button variant={eventView === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setEventView('calendar')}><Calendar className="h-4 w-4"/></Button>
                        </div>
                    )}
                </div>
                 <div className="mt-6">
                    <TabsContent value={activeTab} className="mt-0">
                        {activeTab === 'event' && eventView === 'calendar' ? (
                            <EventCalendarView events={filteredOfferings} onEventClick={handleOpenEditInstanceDialog} onAddEvent={handleOpenInstanceDialog} />
                        ) : filteredOfferings.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredOfferings.map(offering => (
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
                                        <CardFooter className="mt-auto pt-0 flex justify-end items-center">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleManageFunnels(offering.id)}>
                                                        <GitBranch className="mr-2 h-4 w-4" />
                                                        <span>Manage Funnels</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleOpenEditDialog(offering)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleOpenCloneDialog(offering)}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        <span>Clone</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
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
                             <div className="text-center py-16 border-2 border-dashed rounded-lg col-span-full">
                                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="text-xl font-semibold mt-4">No {activeTab !== 'all' ? activeTab : ''} Offerings Found</h3>
                                <p className="text-muted-foreground mt-2">Click "New Offering" to add one.</p>
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
             <CreateOfferingDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                profile={profile}
                onOfferingSaved={handleOfferingSaved}
                offeringToEdit={offeringToEdit}
                preselectedDate={preselectedDate}
            />
            <CreateEventInstanceDialog 
                isOpen={isInstanceDialogOpen}
                onOpenChange={setIsInstanceDialogOpen}
                eventTemplates={eventTemplates}
                preselectedDate={preselectedDate}
                onEventInstanceCreated={handleEventInstanceCreated}
            />
             {offeringToEdit && scheduleToEdit && (
                <EditEventInstanceDialog
                    isOpen={isEditInstanceDialogOpen}
                    onOpenChange={setIsEditInstanceDialogOpen}
                    offering={offeringToEdit}
                    schedule={scheduleToEdit}
                    onEventInstanceUpdated={handleEventInstanceUpdated}
                />
            )}
            {offeringToView && (
                <OfferingDetailDialog
                    isOpen={isDetailDialogOpen}
                    onOpenChange={setIsDetailDialogOpen}
                    offering={offeringToView}
                    profile={profile}
                    onEdit={() => {
                        setIsDetailDialogOpen(false);
                        handleOpenEditDialog(offeringToView);
                    }}
                    onDelete={() => handleOfferingDelete(offeringToView.id)}
                    isDeleting={isDeleting}
                />
            )}
        </div>
    );
}
