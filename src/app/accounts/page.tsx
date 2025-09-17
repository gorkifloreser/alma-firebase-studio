
'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plug, CheckCircle, Clock } from 'lucide-react';
import Image from 'next/image';

const accounts = [
    {
        name: 'Instagram',
        description: 'Connect your Instagram account to manage posts and view analytics.',
        icon: '/instagram.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        name: 'Facebook',
        description: 'Connect your Facebook Page for content scheduling and insights.',
        icon: '/facebook.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        name: 'WhatsApp',
        description: 'Connect your WhatsApp Business account to engage with customers.',
        icon: '/whatsapp.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        name: 'Webmail',
        description: 'Connect your email account to send newsletters and sequences.',
        icon: '/mail.svg',
        category: 'email',
        status: 'disconnected'
    },
    {
        name: 'TikTok',
        description: 'Plan and analyze your TikTok content strategy.',
        icon: '/tiktok.svg',
        category: 'future',
        status: 'coming_soon'
    },
    {
        name: 'LinkedIn',
        description: 'Manage your professional presence and content on LinkedIn.',
        icon: '/linkedin.svg',
        category: 'future',
        status: 'coming_soon'
    }
]

const ConnectionCard = ({ name, description, icon, status }: { name: string, description: string, icon: string, status: string }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start gap-4">
                <div className="relative h-10 w-10">
                    <Image src={icon} alt={`${name} logo`} fill />
                </div>
                <div>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardFooter>
                 {status === 'disconnected' && (
                    <Button>
                        <Plug className="mr-2 h-4 w-4" />
                        Connect
                    </Button>
                 )}
                 {status === 'connected' && (
                    <Button variant="secondary" disabled>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Connected
                    </Button>
                 )}
                 {status === 'coming_soon' && (
                    <Button variant="outline" disabled>
                         <Clock className="mr-2 h-4 w-4" />
                        Coming Soon
                    </Button>
                 )}
            </CardFooter>
        </Card>
    )
}

export default function AccountsPage() {
    
    const metaAccounts = accounts.filter(a => a.category === 'meta');
    const emailAccounts = accounts.filter(a => a.category === 'email');
    const futureAccounts = accounts.filter(a => a.category === 'future');

    return (
        <DashboardLayout>
             <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">Accounts & Integrations</h1>
                    <p className="text-muted-foreground">Connect your marketing channels to unlock Alma's full potential.</p>
                </header>

                <div className="space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Meta</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {metaAccounts.map(account => (
                                <ConnectionCard key={account.name} {...account} />
                            ))}
                        </div>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Email</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {emailAccounts.map(account => (
                                <ConnectionCard key={account.name} {...account} />
                            ))}
                        </div>
                    </section>

                    <Separator />

                     <section>
                        <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {futureAccounts.map(account => (
                                <ConnectionCard key={account.name} {...account} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
