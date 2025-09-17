
'use client';

import '@measured/puck/puck.css';
import { Render, type Data } from '@measured/puck';
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getPublicLandingPage } from '@/app/funnels/actions';
import { config } from '@/app/funnels/[funnelId]/edit/components';
import { Loader2 } from 'lucide-react';


export default function PublicLandingPage({ params }: { params: { pageId: string } }) {
    const [data, setData] = useState<Data | null | undefined>(undefined);
    
    useEffect(() => {
        const fetchPage = async () => {
            const pageData = await getPublicLandingPage(params.pageId);
            setData(pageData);
        };
        fetchPage();
    }, [params.pageId]);

    if (data === undefined) {
        return (
             <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (data === null) {
        return notFound();
    }

    return <Render config={config} data={data} />;
}
