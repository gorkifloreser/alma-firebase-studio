
'use client';

import { Puck } from '@measured/puck';
import type { Data } from '@measured/puck';
import { useEffect, useState, use } from 'react';
import { getLandingPage, saveLandingPage } from '@/app/funnels/actions';
import { useToast } from '@/hooks/use-toast';
import { config } from './components';
import { Loader2 } from 'lucide-react';

export default function FunnelEditorPage({ params }: { params: Promise<{ funnelId: string }> }) {
    const { funnelId } = use(params);
    const [initialData, setInitialData] = useState<Data | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const data = await getLandingPage(funnelId);
                if (data) {
                    setInitialData(data);
                } else {
                     toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Landing page data not found.',
                    });
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading page data',
                    description: error.message,
                });
            }
        };

        fetchPageData();
    }, [funnelId, toast]);


    const handleSave = async (data: Data) => {
        if (!funnelId) return;
        try {
            await saveLandingPage({ funnelId, data });
            toast({
                title: 'Success!',
                description: 'Your landing page has been saved.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error saving page',
                description: error.message,
            });
        }
    };

    if (!initialData) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
       <Puck
            config={config}
            data={initialData}
            onPublish={handleSave}
       />
    );
}
