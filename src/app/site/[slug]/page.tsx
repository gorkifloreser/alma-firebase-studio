
'use client';

import '@measured/puck/puck.css';
import { Render, type Data } from '@measured/puck';
import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getPublicPageBySlug } from '@/app/website/actions';
import { config } from '@/app/website/edit/[slug]/components';
import { Loader2 } from 'lucide-react';


export default function PublicSitePage({ params }: { params: { slug: string } }) {
    const [data, setData] = useState<Data | null | undefined>(undefined);
    
    useEffect(() => {
        const fetchPage = async () => {
            const pageData = await getPublicPageBySlug(params.slug);
            setData(pageData?.puck_data || null);
        };
        fetchPage();
    }, [params.slug]);

    if (data === undefined) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (data === null) {
        return notFound();
    }

    return <Render config={config} data={data} />;
}
