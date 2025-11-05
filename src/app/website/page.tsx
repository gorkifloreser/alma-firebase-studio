
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Globe, PlusCircle } from 'lucide-react';

export default async function WebsiteDashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // In the future, we would fetch a list of pages here.
    // For now, we will just provide a link to the homepage editor.

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Website</h1>
                        <p className="text-muted-foreground">Manage your public-facing brand website.</p>
                    </div>
                </header>
                <Card>
                    <CardHeader>
                        <CardTitle>Homepage</CardTitle>
                        <CardDescription>
                            This is the main landing page for your brand's website. Click below to edit its content.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button asChild>
                            <Link href="/website/edit/home">
                                <Globe className="mr-2 h-4 w-4" /> Edit Homepage
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
