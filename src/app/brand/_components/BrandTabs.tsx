
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandHeartForm } from "@/app/brand-heart/_components/BrandHeartForm";
import { KnowledgeBaseClientPage } from "@/app/knowledge-base/_components/KnowledgeBaseClientPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, BrainCircuit } from 'lucide-react';
import type { BrandHeartFormProps } from "@/app/brand-heart/_components/BrandHeartForm";
import type { KnowledgeBaseClientPageProps } from "@/app/knowledge-base/_components/KnowledgeBaseClientPage";

interface BrandTabsProps {
    data: {
        brandHeart: BrandHeartFormProps;
        knowledgeBase: KnowledgeBaseClientPageProps;
    };
}

export function BrandTabs({ data }: BrandTabsProps) {

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Brand Soul</h1>
                <p className="text-muted-foreground">Define your brand"s core identity and knowledge.</p>
            </header>
            <Tabs defaultValue="brand-heart" className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="brand-heart" className="gap-2"><Heart className="h-4 w-4" /> Brand Heart</TabsTrigger>
                        <TabsTrigger value="knowledge-base" className="gap-2"><BrainCircuit className="h-4 w-4" /> Knowledge Base</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="brand-heart" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Core Essence</CardTitle>
                            <CardDescription>
                                Fill in these details to give the AI a deep understanding of your brand.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BrandHeartForm {...data.brandHeart} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="knowledge-base" className="mt-6">
                     <KnowledgeBaseClientPage {...data.knowledgeBase} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Define the prop types for the client components
declare module "@/app/brand-heart/_components/BrandHeartForm" {
    export interface BrandHeartFormProps {
        profile: any;
        brandHeart: any;
        languageNames: Map<string, string>;
        updateBrandHeartAction: any;
        translateTextAction: any;
    }
}
declare module "@/app/knowledge-base/_components/KnowledgeBaseClientPage" {
    export interface KnowledgeBaseClientPageProps {
        initialDocuments: any[];
        getBrandDocumentsAction: any;
        deleteBrandDocumentAction: any;
        uploadBrandDocumentAction: any;
        askRagAction: any;
    }
}
