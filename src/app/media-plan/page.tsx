
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getMediaPlans, deleteMediaPlan, MediaPlan } from './actions';
import { Bot, Sparkles, Wand2, GitBranch, MessageSquare, Mail, Instagram, Trash, MoreVertical, Edit, PlusCircle } from 'lucide-react';
import { getOfferings, Offering, OfferingMedia } from '@/app/offerings/actions';
import { ContentGenerationDialog } from '@/app/offerings/_components/ContentGenerationDialog';
import { Funnel, getFunnels } from '@/app/funnels/actions';
import { OrchestrateMediaPlanDialog } from './_components/OrchestrateMediaPlanDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


type PlanItem = MediaPlan['plan_items'][0] & { id?: string };
type OfferingsMap = Map<string, Offering & { offering_media: OfferingMedia[] }>;

const ChannelIcon = ({ channel }: { channel: string }) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes('instagram')) return <Instagram className="h-5 w-5 text-muted-foreground" />;
    if (lowerChannel.includes('facebook')) return <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5H16.5L17.5 9.5H14V7.5C14 6.47 14 5.5 16 5.5H17.5V2.14C17.174 2.097 15.943 2 14.643 2C11.928 2 10 3.657 10 6.7V9.5H7V13.5H10V22H14V13.5Z"></path></svg>;
    if (lowerChannel.includes('email')) return <Mail className="h-5 w-5 text-muted-foreground" />;
    if (lowerChannel.includes('whatsapp')) return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
    return <Sparkles className="h-5 w-5 text-muted-foreground" />;
};

export default function MediaPlanPage() {
    const [mediaPlans, setMediaPlans] = useState<MediaPlan[]>([]);
    const [offerings, setOfferings] = useState<OfferingsMap>(new Map());
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [offeringForContent, setOfferingForContent] = useState<(Offering & { offering_media: OfferingMedia[] }) | null>(null);
    const [sourcePlanItem, setSourcePlanItem] = useState<PlanItem | null>(null);
    const [isOrchestrateDialogOpen, setIsOrchestrateDialogOpen] = useState(false);
    const [planToEdit, setPlanToEdit] = useState<MediaPlan | null>(null);
    const [isDeleting, startDeleting] = useTransition();

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [offeringsData, funnelsData, mediaPlansData] = await Promise.all([
                getOfferings(),
                getFunnels(),
                getMediaPlans(),
            ]);
            const offeringsMap = new Map(offeringsData.map(o => [o.id, o]));
            setOfferings(offeringsMap);
            setFunnels(funnelsData);
            setMediaPlans(mediaPlansData);
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Error loading initial data',
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
            if (!user) redirect('/login');
            fetchAllData();
        };

        checkUserAndFetchData();
    }, []);

    const handleOpenCreateDialog = () => {
        setPlanToEdit(null);
        setIsOrchestrateDialogOpen(true);
    };

    const handleOpenEditDialog = (plan: MediaPlan) => {
        setPlanToEdit(plan);
        setIsOrchestrateDialogOpen(true);
    };

    const handlePlanSaved = () => {
        setIsOrchestrateDialogOpen(false);
        setPlanToEdit(null);
        fetchAllData();
    }

    const handleGenerateContent = (planItem: PlanItem) => {
        const offering = offerings.get(planItem.offeringId);
        if (offering) {
            setSourcePlanItem(planItem);
            setOfferingForContent(offering);
            setIsContentDialogOpen(true);
        } else {
             toast({
                variant: 'destructive',
                title: 'Offering not found',
                description: `Could not find the offering associated with this plan item.`,
            });
        }
    };

    const handleDeletePlan = (planId: string) => {
        startDeleting(async () => {
            try {
                await deleteMediaPlan(planId);
                toast({ title: "Success", description: "Media plan deleted successfully." });
                fetchAllData();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error deleting plan', description: error.message });
            }
        });
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                     <Skeleton className="h-10 w-1/3" />
                     <Skeleton className="h-6 w-2/3 mt-2" />
                    <div className="mt-8 space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Media Orchestrator</h1>
                        <p className="text-muted-foreground">Generate and manage tactical, multi-channel content plans from your strategies.</p>
                    </div>
                     <Button onClick={handleOpenCreateDialog} className="gap-2">
                        <PlusCircle className="h-5 w-5" />
                        Orchestrate New Plan
                    </Button>
                </header>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Saved Media Plans</h2>
                        {mediaPlans.length > 0 ? (
                            <div className="space-y-6">
                            {mediaPlans.map(plan => {
                                const strategy = funnels.find(f => f.id === plan.funnel_id);
                                const groupedPlan = plan.plan_items.reduce((acc, item) => {
                                    const itemWithId = { ...item, id: crypto.randomUUID() };
                                    if (!acc[item.channel]) acc[item.channel] = [];
                                    acc[item.channel].push(itemWithId);
                                    return acc;
                                }, {} as Record<string, PlanItem[]>);

                                return (
                                    <Card key={plan.id}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                 <CardTitle className="text-xl">Plan for: <span className="text-primary">{strategy?.name}</span></CardTitle>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreVertical/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenEditDialog(plan)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                        </DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                    <Trash className="mr-2 h-4 w-4" /> Delete Plan
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete this media plan. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeletePlan(plan.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {Object.entries(groupedPlan).map(([channel, items]) => (
                                                <div key={channel} className="mt-4 first:mt-0">
                                                    <h3 className="font-semibold flex items-center gap-2 mb-2 capitalize">
                                                        <ChannelIcon channel={channel} />
                                                        {channel.replace(/_/g, ' ')} Plan
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {items.map((item) => (
                                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                                                <div className="flex-1 mb-2 sm:mb-0">
                                                                    <p className="font-semibold">{item.format}</p>
                                                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.copy}</p>
                                                                </div>
                                                                <Button variant="outline" size="sm" onClick={() => handleGenerateContent(item)}>
                                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                                    Generate Content
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            </div>
                        ) : (
                             <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-xl font-semibold">No Media Plans Yet</h3>
                                <p className="text-muted-foreground mt-2">
                                    Click 'Orchestrate New Plan' to generate one from a strategy.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <OrchestrateMediaPlanDialog
                isOpen={isOrchestrateDialogOpen}
                onOpenChange={setIsOrchestrateDialogOpen}
                strategies={funnels}
                planToEdit={planToEdit}
                onPlanSaved={handlePlanSaved}
            />

            {offeringForContent && (
                <ContentGenerationDialog
                    isOpen={isContentDialogOpen}
                    onOpenChange={setIsContentDialogOpen}
                    offeringId={offeringForContent.id}
                    offeringTitle={offeringForContent.title.primary}
                    funnels={funnels.filter(f => f.offering_id === offeringForContent.id)}
                    sourcePlanItem={sourcePlanItem}
                />
            )}
        </DashboardLayout>
    );
}
