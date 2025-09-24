
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/toaster';
import { getArtStyles, createArtStyle, updateArtStyle, deleteArtStyle } from './actions';
import { ArtStylesClientPage } from './_components/ArtStylesClientPage';

export default async function ArtStylesPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const artStyles = await getArtStyles();

    return (
        <DashboardLayout>
            <Toaster />
            <ArtStylesClientPage 
                initialArtStyles={artStyles}
                actions={{
                    createArtStyle,
                    updateArtStyle,
                    deleteArtStyle,
                }}
            />
        </DashboardLayout>
    );
}
