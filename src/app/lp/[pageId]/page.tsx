
'use client';

import { notFound } from 'next/navigation';
import { getPublicLandingPage } from '@/app/funnels/actions';
import { Frame, Element } from '@craftjs/core';
import { CjsButton, CjsText, CjsContainer } from '@/app/funnels/[funnelId]/edit/components';
import { useEffect, useState } from 'react';

export default function PublicLandingPage({ params }: { params: { pageId: string } }) {
    const [data, setData] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPublicLandingPage(params.pageId).then(pageData => {
            if (!pageData) {
                notFound();
            }
            setData(pageData);
            setLoading(false);
        });
    }, [params.pageId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!data) {
        return notFound();
    }

    return (
        <Frame json={data}>
             <Element is={CjsContainer} padding={20} background="#fff" canvas>
                <CjsText text="Hi there" fontSize={20} />
                <CjsButton size="small" text="Click me" />
            </Element>
        </Frame>
    );
}
