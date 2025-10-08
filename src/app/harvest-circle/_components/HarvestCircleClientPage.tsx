
'use client';

import React, { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HarvestList } from './HarvestList';
import { TestimonialRepository } from './TestimonialRepository';
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
                <p className="text-muted-foreground">Manage post-sale flows and gather testimonials.</p>
            </header>

            <Tabs defaultValue="delivery" className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="delivery">Offering Delivery</TabsTrigger>
                        <TabsTrigger value="testimonials">Testimonial Repository</TabsTrigger>
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
            </Tabs>
        </div>
    );
}
