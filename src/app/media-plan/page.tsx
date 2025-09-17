
'use client';

import React, { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { generateMediaPlan, saveContent } from './actions';
import type { GenerateMediaPlanOutput } from '@/ai/flows/generate-media-plan-flow';
import { Bot, Sparkles, Wand2, Plus, MessageSquare, Mail, Instagram } from 'lucide-react';
import { getOfferings, Offering, OfferingMedia } from '@/app/offerings/actions';
import { ContentGenerationDialog } from '@/app/offerings/_components/ContentGenerationDialog';
import { getProfile } from '@/app/settings/actions';


type PlanItem = GenerateMediaPlanOutput['plan'][0];
type OfferingsMap = Map<string, Offering & { offering_media: OfferingMedia[] }>;

const ChannelIcon = ({ channel }: { channel: string }) => {
    switch (channel) {
        case 'Social Media': return <Instagram className="h-5 w-5 text-muted-foreground" />;
        case 'Email': return <Mail className="h-5 w-5 text-muted-foreground" />;
        case 'WhatsApp': return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
        default: return <Sparkles className="h-5 w-5 text-muted-foreground" />;
    }
}


export default function MediaPlanPage() {
    const [mediaPlan, setMediaPlan] = useState<GenerateMediaPlanOutput | null>(null);
    const [offerings, setOfferings] = useState<OfferingsMap>(new Map());
    const [isGenerating, startGenerating] = useTransition();
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [offeringForContent, setOfferingForContent] = useState<(Offering & { offering_media: OfferingMedia[] }) | null>(null);
    
    React.useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                redirect('/login');
            }
            try {
                const [profileData, offeringsData] = await Promise.all([
                    getProfile(),
                    getOfferings()
                ]);

                const offeringsMap = new Map(offeringsData.map(o => [o.id, o]));
                setOfferings(offeringsMap);

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

        checkUserAndFetchData();
    }, [toast]);

    const handleGeneratePlan = () => {
        startGenerating(async () => {
            setMediaPlan(null);
            try {
                const result = await generateMediaPlan();
                setMediaPlan(result);
                toast({
                    title: 'Media Plan Generated!',
                    description: 'Here are some strategic content ideas for the week.'
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Generation Failed',
                    description: error.message,
                });
            }
        });
    };

    const handleGenerateContent = (planItem: PlanItem) => {
        const offering = offerings.get(planItem.offeringId);
        if (offering) {
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
    
    const PlanSkeleton = () => (
         <div className="space-y-4">
            <Skeleton className="h-8 w-48 mb-6" />
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );

    const groupedPlan = mediaPlan?.plan.reduce((acc, item) => {
        if (!acc[item.channel]) {
            acc[item.channel] = [];
        }
        acc[item.channel].push(item);
        return acc;
    }, {} as Record<string, PlanItem[]>);


    return (
        <DashboardLayout>
            <Toaster />
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Media Orchestrator</h1>
                    <p className="text-muted-foreground">Generate a strategic, multi-channel content plan for your active offerings.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Generate a New Plan</CardTitle>
                        <CardDescription>
                            Click the button to have your AI assistant analyze all your active offerings and create a holistic content plan for the week.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGeneratePlan} disabled={isGenerating || isLoading}>
                            {isGenerating ? (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                                    Orchestrating...
                                </>
                            ) : (
                                <>
                                    <Bot className="mr-2 h-5 w-5" />
                                    Generate Media Plan
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {isGenerating && <PlanSkeleton />}

                {groupedPlan && (
                    <div className="space-y-8">
                        {Object.entries(groupedPlan).map(([channel, items]) => (
                            <Card key={channel}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ChannelIcon channel={channel} />
                                        {channel}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {items.map((item, index) => (
                                            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                                <div className="flex-1 mb-2 sm:mb-0">
                                                    <p className="font-semibold">{item.format}</p>
                                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    {offerings.has(item.offeringId) && (
                                                        <p className="text-xs text-primary font-medium mt-1">
                                                            For: {offerings.get(item.offeringId)?.title.primary}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => handleGenerateContent(item)}>
                                                     <Wand2 className="mr-2 h-4 w-4" />
                                                     Generate
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {offeringForContent && (
                <ContentGenerationDialog
                    isOpen={isContentDialogOpen}
                    onOpenChange={setIsContentDialogOpen}
                    offeringId={offeringForContent.id}
                    offeringTitle={offeringForContent.title.primary}
                />
            )}
        </DashboardLayout>
    );
}

