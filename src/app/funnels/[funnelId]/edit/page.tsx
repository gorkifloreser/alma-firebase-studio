
'use client';

import { Puck } from '@measured/puck-react';
import { Config, Data } from '@measured/puck';
import { puckComponents, puckCategories } from './components';
import '@measured/puck-react/dist/index.css';
import { Button } from '@/components/ui/button';
import { getLandingPage, saveLandingPage } from '../../actions';
import { useEffect, useState, useTransition } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function FunnelEditorPage({ params }: { params: { funnelId: string } }) {
    const [initialData, setInitialData] = useState<Data | undefined>(undefined);
    const [stepId, setStepId] = useState<string | null>(null);
    const [pagePath, setPagePath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const pageData = await getLandingPage(params.funnelId);
                setInitialData(pageData.data);
                setStepId(pageData.id);
                setPagePath(pageData.path);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading page data',
                    description: error.message,
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchPageData();
    }, [params.funnelId, toast]);

    const config: Config = {
        components: puckComponents,
        categories: puckCategories,
        root: {
            render: ({ children }) => {
                return (
                    <div style={{ padding: 40 }}>
                        {children}
                    </div>
                )
            }
        }
    };

    const handleSave = (data: Data) => {
        if (!stepId) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Cannot save, step ID is missing.'
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
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!initialData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Could not load landing page data.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen">
            <Toaster />
            <header className="bg-background border-b p-4 flex justify-between items-center z-10">
                <h1 className="text-xl font-bold">Landing Page Editor</h1>
                 <div className="flex items-center gap-2">
                    {pagePath && (
                        <Button variant="outline" asChild>
                            <Link href={`/lp/${pagePath}`} target="_blank">View Page</Link>
                        </Button>
                    )}
                    <Puck.SaveButton>
                        {({ children, state }) => (
                            <Button
                                onClick={() => handleSave(state.data)}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        )}
                    </Puck.SaveButton>
                </div>
            </header>
            <Puck config={config} data={initialData} onChange={setInitialData} />
        </div>
    );
}

// Override Puck's default SaveButton to integrate with our custom save logic
const PuckSaveButton = ({ children }: { children: (props: {
    children: React.ReactNode,
    state: { data: Data }
}) => React.ReactNode }) => {
    const { state } = Puck.usePuck();
    return children({ children: 'Save', state });
};

Puck.SaveButton = PuckSaveButton;
