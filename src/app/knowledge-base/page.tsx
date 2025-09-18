
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getBrandDocuments, deleteBrandDocument, uploadBrandDocument, askRag } from './actions';
import { KnowledgeBaseClientPage } from './_components/KnowledgeBaseClientPage';

export default async function KnowledgeBasePage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const initialDocuments = await getBrandDocuments();

    return (
        <DashboardLayout>
            <Toaster />
            <KnowledgeBaseClientPage
                initialDocuments={initialDocuments}
                getBrandDocumentsAction={getBrandDocuments}
                deleteBrandDocumentAction={deleteBrandDocument}
                uploadBrandDocumentAction={uploadBrandDocument}
                askRagAction={askRag}
            />
        </DashboardLayout>
    );
}
