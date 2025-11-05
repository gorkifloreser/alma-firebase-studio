
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getPublicPageBySlug } from '@/app/website/actions';
import { config, Render, type PageData } from '@/app/website/edit/[slug]/components';
import { Loader2 } from 'lucide-react';


export default function PublicSitePage({ params }: { params: { slug: string } }) {
    const [pageData, setPageData] = useState<PageData | null | undefined>(undefined);
    
    useEffect(() => {
        const fetchPage = async () => {
            const result = await getPublicPageBySlug(params.slug);
            setPageData(result?.puck_data || null);
        };
        fetchPage();
    }, [params.slug]);

    if (pageData === undefined) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (pageData === null) {
        return notFound();
    }

    return <Render config={config} data={pageData} />;
}
