
'use client';

import React, { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HarvestList } from './HarvestList';
import { TestimonialRepository } from './TestimonialRepository';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Sparkles, Leaf, Bot } from 'lucide-react';
import type { getHarvestItems, updateHarvestItemStatus, requestTestimonial, getTestimonials, saveTestimonial, createContentFromTestimonial } from '../actions';
import type { getProfile } from '@/app/settings/actions';
import type { HarvestItem, Testimonial } from '../actions';
import type { Offering } from '@/app/offerings/actions';

type Profile = Awaited<ReturnType<typeof getProfile>>;

interface HarvestCircleClientPageProps {
    initialHarvestItems: HarvestItem[];
    initialTestimonials: Testimonial[];
    initialOfferings: Offering[];
    profile: Profile;
    actions: {
        getHarvestItems: typeof getHarvestItems;
        updateHarvestItemStatus: typeof updateHarvestItemStatus;
        requestTestimonial: typeof requestTestimonial;
        getTestimonials: typeof getTestimonials;
        saveTestimonial: typeof saveTestimonial;
        createContentFromTestimonial: typeof createContentFromTestimonial;
    };
}


const CommunitySowingTab = () => {
    // Mocked data for now, to be replaced with AI flow
    const [ideas, setIdeas] = useState([
        { id: 1, text: "Host a free workshop on a topic related to your most popular offering." },
        { id: 2, text: "Donate 5% of this month's profits to a local charity aligned with your brand values." },
        { id: 3, text: "Organize a local community clean-up day and share the results." },
    ]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateIdea = () => {
        setIsGenerating(true);
        // In the future, this will call a Genkit flow.
        setTimeout(() => {
            setIdeas(prev => [...prev, { id: Date.now(), text: "Partner with another local creator for a joint community event." }]);
            setIsGenerating(false);
        }, 1000);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Community Sowing</CardTitle>
                <CardDescription>Generate ideas to give back, based on your brand's soul. Then, turn them into content to share your impact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="flex justify-center">
                    <Button onClick={handleGenerateIdea} disabled={isGenerating}>
                        <Sparkles className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Generating...' : 'Generate New Idea'}
                    </Button>
                </div>
                {ideas.length > 0 ? (
                    <div className="space-y-4">
                        {ideas.map(idea => (
                            <Card key={idea.id} className="bg-muted/50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <p className="italic">“{idea.text}”</p>
                                    <Button variant="outline" size="sm" disabled>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Create Content
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mt-4">Ready to plant a seed?</h3>
                        <p className="text-muted-foreground mt-2">
                           Click "Generate New Idea" and the AI will suggest ways to give back.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export function HarvestCircleClientPage({
    initialHarvestItems,
    initialTestimonials,
    initialOfferings,
    profile,
    actions,
}: HarvestCircleClientPageProps) {
    console.log('[HarvestCircleClientPage] Component mounted. Initial items:', initialHarvestItems.length, 'Initial testimonials:', initialTestimonials.length);
    const [harvestItems, setHarvestItems] = useState(initialHarvestItems);
    const [testimonials, setTestimonials] = useState(initialTestimonials);

    const handleDataRefresh = async () => {
        console.log('[HarvestCircleClientPage] handleDataRefresh triggered.');
        try {
            const [items, tests] = await Promise.all([
                actions.getHarvestItems(),
                actions.getTestimonials(),
            ]);
            setHarvestItems(items);
            setTestimonials(tests);
            console.log('[HarvestCircleClientPage] Data refreshed successfully.');
        } catch (error) {
            console.error('[HarvestCircleClientPage] Error refreshing data:', error);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Harvest Circle</h1>
                <p className="text-muted-foreground">Manage post-sale flows, gather testimonials, and give back to your community.</p>
            </header>

            <Tabs defaultValue="delivery" className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="delivery">Offering Delivery</TabsTrigger>
                        <TabsTrigger value="testimonials">Testimonial Repository</TabsTrigger>
                        <TabsTrigger value="sowing" className="gap-2"><Leaf className="h-4 w-4"/> Community Sowing</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="delivery" className="mt-6">
                    <HarvestList
                        initialItems={harvestItems}
                        actions={{
                            updateHarvestItemStatus: actions.updateHarvestItemStatus,
                            requestTestimonial: actions.requestTestimonial,
                        }}
                        onDataChange={handleDataRefresh}
                    />
                </TabsContent>
                <TabsContent value="testimonials" className="mt-6">
                    <TestimonialRepository
                        initialTestimonials={testimonials}
                        offerings={initialOfferings}
                        actions={{
                            saveTestimonial: actions.saveTestimonial,
                            createContentFromTestimonial: actions.createContentFromTestimonial,
                        }}
                        onDataChange={handleDataRefresh}
                    />
                </TabsContent>
                 <TabsContent value="sowing" className="mt-6">
                    <CommunitySowingTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
