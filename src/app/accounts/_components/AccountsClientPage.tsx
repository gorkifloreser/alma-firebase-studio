
'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { updateUserChannels } from '../actions';

type AccountStatus = 'available' | 'coming_soon';
interface Account {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'meta' | 'email' | 'future';
    status: AccountStatus;
}

const initialAccounts: Account[] = [
    { id: 'instagram', name: 'Instagram', description: 'Enable Instagram for post generation and analytics.', icon: '/instagram.svg', category: 'meta', status: 'available' },
    { id: 'facebook', name: 'Facebook', description: 'Enable Facebook for content scheduling and insights.', icon: '/facebook.svg', category: 'meta', status: 'available' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'Enable WhatsApp to engage with customers.', icon: '/whatsapp.svg', category: 'meta', status: 'available' },
    { id: 'telegram', name: 'Telegram', description: 'Enable Telegram for messaging and automations.', icon: '/telegram.svg', category: 'meta', status: 'available' },
    { id: 'webmail', name: 'Webmail', description: 'Enable email to send newsletters and sequences.', icon: '/mail.svg', category: 'email', status: 'available' },
    { id: 'website', name: 'Website/Blog', description: 'Enable for landing pages and SEO content.', icon: '/globe.svg', category: 'email', status: 'available' },
    { id: 'tiktok', name: 'TikTok', description: 'Plan and analyze your TikTok content strategy.', icon: '/tiktok.svg', category: 'future', status: 'coming_soon' },
    { id: 'linkedin', name: 'LinkedIn', description: 'Manage your professional presence and content on LinkedIn.', icon: '/linkedin.svg', category: 'future', status: 'coming_soon' }
];

interface AccountsClientPageProps {
    initialChannels: string[];
    updateUserChannelsAction: typeof updateUserChannels;
}

export function AccountsClientPage({ initialChannels, updateUserChannelsAction }: AccountsClientPageProps) {
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(initialChannels));
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const handleChannelToggle = (channelId: string, checked: boolean) => {
        const newSelectedChannels = new Set(selectedChannels);
        if (checked) {
            newSelectedChannels.add(channelId);
        } else {
            newSelectedChannels.delete(channelId);
        }
        
        startSaving(async () => {
            try {
                await updateUserChannelsAction(Array.from(newSelectedChannels));
                setSelectedChannels(newSelectedChannels); // Update state on success
                toast({
                    title: 'Channels updated',
                    description: 'Your channel selections have been saved.'
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Failed to update channels',
                    description: error.message
                });
            }
        });
    };

    const renderCard = (account: Account) => (
        <Card key={account.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start gap-4">
                <div className="relative h-10 w-10 flex-shrink-0">
                    <Image src={account.icon} alt={`${account.name} logo`} fill />
                </div>
                <div>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>{account.description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 {account.status === 'coming_soon' && (
                    <div className="flex items-center gap-2 rounded-md bg-secondary p-3">
                         <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-secondary-foreground">
                           Coming Soon
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <div className="flex items-center space-x-2">
                    <Checkbox
                        id={`check-${account.id}`}
                        checked={selectedChannels.has(account.id)}
                        onCheckedChange={(checked) => handleChannelToggle(account.id, !!checked)}
                        disabled={account.status === 'coming_soon' || isSaving}
                    />
                    <Label
                        htmlFor={`check-${account.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                       {selectedChannels.has(account.id) ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
            </CardFooter>
        </Card>
    );

    const metaAccounts = initialAccounts.filter(a => a.category === 'meta');
    const emailAccounts = initialAccounts.filter(a => a.category === 'email');

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Accounts & Integrations</h1>
                <p className="text-muted-foreground">Select your active marketing channels to be used by the AI.</p>
            </header>
            <div className="space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Social & Messaging</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {metaAccounts.map(renderCard)}
                    </div>
                </section>
                <Separator />
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Owned Media</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {emailAccounts.map(renderCard)}
                    </div>
                </section>
            </div>
        </div>
    );
}
