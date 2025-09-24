
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getProfile } from '@/app/settings/actions';
import { getBrandHeart, updateBrandHeart, translateText } from '../brand-heart/actions';
import { getBrandDocuments, deleteBrandDocument, uploadBrandDocument, askRag } from '../knowledge-base/actions';
import { getArtStyles, createArtStyle, updateArtStyle, deleteArtStyle } from '../art-styles/actions';
import { languages } from '@/lib/languages';
import { BrandTabs } from './_components/BrandTabs';

export default async function BrandPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [profile, brandHeart, documents, artStyles] = await Promise.all([
        getProfile(),
        getBrandHeart(),
        getBrandDocuments(),
        getArtStyles(),
    ]);

    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    const tabData = {
        brandHeart: {
            profile,
            brandHeart,
            languageNames,
            updateBrandHeartAction: updateBrandHeart,
            translateTextAction: translateText,
        },
        knowledgeBase: {
            initialDocuments: documents,
            getBrandDocumentsAction: getBrandDocuments,
            deleteBrandDocumentAction: deleteBrandDocument,
            uploadBrandDocumentAction: uploadBrandDocument,
            askRagAction: askRag,
        },
        artStyles: {
            initialArtStyles: artStyles,
            actions: {
                createArtStyle,
                updateArtStyle,
                deleteArtStyle,
            },
        }
    };

    return (
        <DashboardLayout>
            <Toaster />
            <BrandTabs data={tabData} />
        </DashboardLayout>
    );
}
