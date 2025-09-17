
import { notFound } from 'next/navigation';
import { getPublicLandingPage } from '@/app/funnels/actions';

// The 'Render' component and 'Config' type from puck-editor have been removed as the package is incorrect.
// The public landing page will need to be re-implemented with the correct visual editor.

export default async function PublicLandingPage({ params }: { params: { pageId: string } }) {

    const data = await getPublicLandingPage(params.pageId);
    
    if (!data) {
        notFound();
    }

    return (
        <div>
            <h1>Landing Page</h1>
            <p>The visual editor component is missing. Please check package dependencies.</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
