
import { Render } from '@measured/puck-react';
import { notFound } from 'next/navigation';
import { getPublicLandingPage } from '@/app/funnels/actions';
import { puckComponents } from '@/app/funnels/[funnelId]/edit/components';
import { Config } from '@measured/puck';

const config: Config = {
    components: puckComponents,
};

export default async function PublicLandingPage({ params }: { params: { pageId: string } }) {

    const data = await getPublicLandingPage(params.pageId);
    
    if (!data) {
        notFound();
    }

    return (
        <Render
            config={config}
            data={data}
        />
    );
}
