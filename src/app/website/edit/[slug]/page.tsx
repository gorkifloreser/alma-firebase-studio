
'use client';

import '@measured/puck/puck.css';
import { Puck, type Data } from '@measured/puck';
import { useEffect, useState } from 'react';
import { getPageBySlug, savePage } from '@/app/website/actions';
import { useToast } from '@/hooks/use-toast';
import { config } from './components';
import { Loader2 } from 'lucide-react';

export default function WebsiteEditorPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const [initialData, setInitialData] = useState<Data | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const data = await getPageBySlug(slug);
                setInitialData(data?.puck_data || { root: { props: { title: slug } }, content: [] });
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading page data',
                    description: error.message,
                });
                // Provide a default structure on error so the editor can still load
                setInitialData({ root: { props: { title: slug } }, content: [] });
            }
        };

        fetchPageData();
    }, [slug, toast]);


    const handleSave = async (data: Data) => {
        try {
            await savePage(slug, data);
            toast({
                title: 'Success!',
                description: `Page "${slug}" has been saved.`,
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
