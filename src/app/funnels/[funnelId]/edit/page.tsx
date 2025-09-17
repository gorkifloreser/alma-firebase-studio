
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import { Layers } from '@craftjs/layers';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getLandingPage, saveLandingPage } from '@/app/funnels/actions';

// Import Craft.js compatible components
import { CjsButton, CjsText, CjsContainer } from './components';

export default function FunnelEditorPage({ params }: { params: { funnelId: string } }) {
    const [json, setJson] = useState<string | undefined>(undefined);
    const [stepId, setStepId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();
    const [path, setPath] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const { id, data, path: pagePath } = await getLandingPage(params.funnelId);
                setStepId(id);
                if (data && typeof data === 'string') {
                    setJson(data);
                }
                setPath(pagePath);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading page',
                    description: error.message,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, [params.funnelId, toast]);

    const handleSave = (data: string) => {
        if (!stepId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Cannot save page without a valid ID.',
            });
            return;
        }

        startSaving(async () => {
            try {
                await saveLandingPage({ stepId, data });
                toast({
                    title: 'Success!',
                    description: 'Your landing page has been saved.',
                });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Save failed',
                    description: error.message,
                });
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Editor
            resolver={{ CjsButton, CjsText, CjsContainer }}
            onSave={(data) => handleSave(data)}
        >
            <div className="flex flex-col h-screen">
                <Toaster />
                <header className="bg-background border-b p-4 flex justify-between items-center z-10">
                    <h1 className="text-xl font-bold">Landing Page Editor</h1>
                    <div className="flex items-center gap-2">
                        {path && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/lp/${path}`} target="_blank">
                                    View Live Page
                                </Link>
                            </Button>
                        )}
                         <Button
                            onClick={() => {
                                const editorState = (window as any).__CRAFTJS_EDITOR__.query.serialize();
                                handleSave(editorState);
                            }}
                            disabled={isSaving}
                            className="gap-2"
                         >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </header>
                <div className="flex-1 flex">
                    <main className="flex-1 bg-muted/20">
                       <Frame json={json}>
                            <Element is={CjsContainer} padding={20} background="#fff" canvas>
                                <CjsText text="Hi there" fontSize={20} />
                                <CjsButton size="small" text="Click me" />
                            </Element>
                        </Frame>
                    </main>
                    <aside className="w-[300px] bg-background border-l">
                         <h2 className="p-4 font-semibold text-lg border-b">Layers</h2>
                         <Layers />
                    </aside>
                </div>
            </div>
        </Editor>
    );
}
