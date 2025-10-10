
// GEMINI_SAFE_START
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getProfile } from '@/app/settings/actions';
import { getBrandHeart, updateBrandHeart, translateText, generateAudienceSuggestion } from '../brand-heart/actions';
import { getBrandDocuments, deleteBrandDocument, uploadBrandDocument, askRag, generateAndStoreEmbeddings } from '../knowledge-base/actions';
import { getUserChannels, updateUserChannels, updateChannelBestPractices, getMetaOAuthUrl, disconnectMetaAccount, setActiveConnection } from '../accounts/actions';
import { languages } from '@/lib/languages';
import { BrandTabs } from './_components/BrandTabs';

export default async function BrandHeartPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch all necessary data in parallel
    const [profile, brandHeart, documents, userChannels] = await Promise.all([
        getProfile(),
        getBrandHeart(),
        getBrandDocuments(),
        getUserChannels(),
    ]);

    const languageNames = new Map(languages.map(l => [l.value, l.label]));

    // Consolidate all props for BrandTabs
    const tabData = {
        brandHeart: {
            profile,
            brandHeart,
            languageNames,
            updateBrandHeartAction: updateBrandHeart,
            translateTextAction: translateText,
        },
        audience: {
            profile,
            brandHeart,
            updateBrandHeartAction: updateBrandHeart,
            generateAudienceAction: generateAudienceSuggestion,
        },
        knowledgeBase: {
            initialDocuments: documents,
            getBrandDocumentsAction: getBrandDocuments,
            deleteBrandDocumentAction: deleteBrandDocument,
            uploadBrandDocumentAction: uploadBrandDocument,
            askRagAction: askRag,
            generateAndStoreEmbeddingsAction: generateAndStoreEmbeddings,
        },
        accounts: {
            initialUserChannels: userChannels,
            updateUserChannelsAction: updateUserChannels,
            updateChannelBestPracticesAction: updateChannelBestPractices,
            getMetaOAuthUrl: getMetaOAuthUrl,
            disconnectMetaAccount: disconnectMetaAccount,
            setActiveConnection: setActiveConnection,
            getUserChannels: getUserChannels,
        },
    };

    return (
        <DashboardLayout>
            <Toaster />
            <BrandTabs data={tabData} />
        </DashboardLayout>
    );
}
// GEMINI_SAFE_END
