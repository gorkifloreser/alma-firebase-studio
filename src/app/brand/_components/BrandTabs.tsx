
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrandHeartForm } from "@/app/brand-heart/_components/BrandHeartForm";
import { KnowledgeBaseClientPage } from "@/app/knowledge-base/_components/KnowledgeBaseClientPage";
import { AccountsClientPage } from "@/app/accounts/_components/AccountsClientPage";
import { AudienceForm } from './AudienceForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, BrainCircuit, Users, CreditCard } from 'lucide-react';
import type { BrandHeartFormProps } from "@/app/brand-heart/_components/BrandHeartForm";
import type { KnowledgeBaseClientPageProps } from "@/app/knowledge-base/_components/KnowledgeBaseClientPage";
import type { AccountsClientPageProps } from "@/app/accounts/_components/AccountsClientPage";
import type { AudienceFormProps } from "./AudienceForm";


interface BrandTabsProps {
    data: {
        brandHeart: BrandHeartFormProps;
        audience: AudienceFormProps;
        knowledgeBase: KnowledgeBaseClientPageProps;
        accounts: AccountsClientPageProps;
    };
}

const BRAND_HEART_TAB_STORAGE_KEY = 'brand-heart-active-tab';

export function BrandTabs({ data }: BrandTabsProps) {
    const [activeTab, setActiveTab] = useState('brand-heart');

    useEffect(() => {
        const savedTab = localStorage.getItem(BRAND_HEART_TAB_STORAGE_KEY);
        if (savedTab) {
            setActiveTab(savedTab);
        }
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        localStorage.setItem(BRAND_HEART_TAB_STORAGE_KEY, value);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Brand Heart</h1>
                <p className="text-muted-foreground">Define your brand's core identity, knowledge, and integrations.</p>
            </header>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex justify-center">
                    <TabsList>
                        <TabsTrigger value="brand-heart" className="gap-2"><Heart className="h-4 w-4" /> Core Essence</TabsTrigger>
                        <TabsTrigger value="audience" className="gap-2"><Users className="h-4 w-4" /> Audience</TabsTrigger>
                        <TabsTrigger value="knowledge-base" className="gap-2"><BrainCircuit className="h-4 w-4" /> Knowledge Base</TabsTrigger>
                        <TabsTrigger value="accounts" className="gap-2"><CreditCard className="h-4 w-4" /> Accounts</TabsTrigger>
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
                <TabsContent value="audience" className="mt-6">
                    <Card>
                         <CardHeader>
                            <CardTitle>Audience / Buyer Persona</CardTitle>
                            <CardDescription>
                                Define who your ideal customer is. This is crucial for the AI to create resonant content.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AudienceForm {...data.audience} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="knowledge-base" className="mt-6">
                     <KnowledgeBaseClientPage {...data.knowledgeBase} />
                </TabsContent>
                <TabsContent value="accounts" className="mt-6">
                     <AccountsClientPage {...data.accounts} />
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

declare module "@/app/brand/_components/AudienceForm" {
    export interface AudienceFormProps {
        profile: any;
        brandHeart: any;
        languageNames: Map<string, string>;
        updateBrandHeartAction: any;
        translateTextAction: any;
        generateAudienceAction: any;
    }
}


declare module "@/app/knowledge-base/_components/KnowledgeBaseClientPage" {
    export interface KnowledgeBaseClientPageProps {
        initialDocuments: any[];
        getBrandDocumentsAction: any;
        deleteBrandDocumentAction: any;
        uploadBrandDocumentAction: any;
        askRagAction: any;
        generateAndStoreEmbeddingsAction: any;
    }
}

declare module "@/app/accounts/_components/AccountsClientPage" {
    export interface AccountsClientPageProps {
        initialUserChannels: any[];
        socialConnections: any[];
        updateUserChannelsAction: any;
        updateChannelBestPracticesAction: any;
        getMetaOAuthUrl: any;
        disconnectMetaAccount: any;
        setActiveConnection: any;
        getSocialConnections: any;
    }
}
