

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getProfile } from '@/app/settings/actions';
import { getBrandHeart, updateBrandHeart, translateText } from '../brand-heart/actions';
import { getBrandDocuments, deleteBrandDocument, uploadBrandDocument, askRag, generateAndStoreEmbeddings } from '../knowledge-base/actions';
import { getUserChannels, updateUserChannels, updateChannelBestPractices, getSocialConnections, getMetaOAuthUrl, disconnectMetaAccount, setActiveConnection } from '../accounts/actions';
import { languages } from '@/lib/languages';
import { BrandTabs } from './_components/BrandTabs';

export default async function BrandPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [profile, brandHeart, documents, userChannels, socialConnections] = await Promise.all([
        getProfile(),
        getBrandHeart(),
        getBrandDocuments(),
        getUserChannels(),
        getSocialConnections(),
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
            generateAndStoreEmbeddingsAction: generateAndStoreEmbeddings,
        },
        accounts: {
            initialUserChannels: userChannels,
            socialConnections: socialConnections,
            updateUserChannelsAction: updateUserChannels,
            updateChannelBestPracticesAction: updateChannelBestPractices,
            getMetaOAuthUrl: getMetaOAuthUrl,
            disconnectMetaAccount: disconnectMetaAccount,
            setActiveConnection: setActiveConnection,
            getSocialConnections: getSocialConnections,
        },
    };

    return (
        <DashboardLayout>
            <Toaster />
            <BrandTabs data={tabData} />
        </DashboardLayout>
    );
}
