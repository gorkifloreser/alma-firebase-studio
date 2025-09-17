
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { generateMediaPlan } from './actions';
import type { GenerateMediaPlanOutput } from '@/ai/flows/generate-media-plan-flow';
import { Bot, Sparkles, Wand2, GitBranch, MessageSquare, Mail, Instagram, ArrowRight } from 'lucide-react';
import { getOfferings, Offering, OfferingMedia } from '@/app/offerings/actions';
import { ContentGenerationDialog } from '@/app/offerings/_components/ContentGenerationDialog';
import { Funnel, getFunnels } from '@/app/funnels/actions';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type PlanItem = GenerateMediaPlanOutput['plan'][0];
type OfferingsMap = Map<string, Offering & { offering_media: OfferingMedia[] }>;

const ChannelIcon = ({ channel }: { channel: string }) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes('social')) return <Instagram className="h-5 w-5 text-muted-foreground" />;
    if (lowerChannel.includes('email')) return <Mail className="h-5 w-5 text-muted-foreground" />;
    if (lowerChannel.includes('whatsapp')) return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
    return <Sparkles className="h-5 w-5 text-muted-foreground" />;
};

export default function MediaPlanPage() {
    const [mediaPlan, setMediaPlan] = useState<GenerateMediaPlanOutput | null>(null);
    const [offerings, setOfferings] = useState<OfferingsMap>(new Map());
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [generatingForFunnelId, setGeneratingForFunnelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [offeringForContent, setOfferingForContent] = useState<(Offering & { offering_media: OfferingMedia[] }) | null>(null);
    const [sourcePlanItem, setSourcePlanItem] = useState<PlanItem | null>(null);
    
    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) redirect('/login');

            try {
                const [offeringsData, funnelsData] = await Promise.all([
                    getOfferings(),
                    getFunnels()
                ]);
                const offeringsMap = new Map(offeringsData.map(o => [o.id, o]));
                setOfferings(offeringsMap);
                setFunnels(funnelsData);
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

    const [isGenerating, startGenerating] = useTransition();

    const handleGeneratePlan = (funnelId: string) => {
        startGenerating(async () => {
            setMediaPlan(null);
            setGeneratingForFunnelId(funnelId);
            try {
                const result = await generateMediaPlan({ funnelId });
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
            } finally {
                setGeneratingForFunnelId(null);
            }
        });
    };

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
    
    const groupedPlan = mediaPlan?.plan.reduce((acc, item) => {
        if (!acc[item.channel]) {
            acc[item.channel] = [];
        }
        acc[item.channel].push(item);
        return acc;
    }, {} as Record<string, PlanItem[]>);


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
                <header>
                    <h1 className="text-3xl font-bold">Media Orchestrator</h1>
                    <p className="text-muted-foreground">Generate a strategic, multi-channel content plan from your blueprints.</p>
                </header>

                <div className="space-y-6">
                    <h2 className="text-2xl font-semibold border-b pb-2">Your Strategies</h2>
                    {funnels.length > 0 ? (
                        funnels.map(funnel => (
                            <Card key={funnel.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <GitBranch className="h-5 w-5" />
                                                {funnel.name}
                                            </CardTitle>
                                            <CardDescription>
                                                For Offering: <span className="font-medium text-foreground">{funnel.offerings?.title.primary || 'N/A'}</span>
                                            </CardDescription>
                                        </div>
                                        <Button 
                                            onClick={() => handleGeneratePlan(funnel.id)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating && generatingForFunnelId === funnel.id ? (
                                                <>
                                                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                                Orchestrating...
                                                </>
                                            ) : (
                                                <>
                                                <Bot className="mr-2 h-4 w-4" />
                                                Orchestrate Media Plan
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <p className="text-sm text-muted-foreground">Channels:</p>
                                        <div className="flex gap-2">
                                            {funnel.strategy_brief?.channels?.map(channel => (
                                                <Badge key={channel} variant="secondary" className="capitalize">{channel.replace(/_/g, ' ')}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                {generatingForFunnelId === funnel.id && mediaPlan && (
                                     <CardContent>
                                        {Object.entries(groupedPlan || {}).map(([channel, items]) => (
                                            <div key={channel} className="mt-4">
                                                <h3 className="font-semibold flex items-center gap-2 mb-2">
                                                    <ChannelIcon channel={channel} />
                                                    {channel} Plan
                                                </h3>
                                                <div className="space-y-3">
                                                    {items.map((item, index) => (
                                                        <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-md border bg-background hover:bg-muted/50 transition-colors">
                                                            <div className="flex-1 mb-2 sm:mb-0">
                                                                <p className="font-semibold">{item.format}</p>
                                                                <p className="text-sm text-muted-foreground">{item.description}</p>
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
                                )}
                            </Card>
                        ))
                    ) : (
                         <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">No Strategies Found</h3>
                            <p className="text-muted-foreground mt-2">
                                You need to create a strategy before you can generate a media plan.
                            </p>
                            <Button asChild className="mt-4">
                               <Link href="/funnels">
                                    Go to Strategies <ArrowRight className="ml-2 h-4 w-4"/>
                               </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

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
