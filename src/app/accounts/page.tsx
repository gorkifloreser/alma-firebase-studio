
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plug, CheckCircle, Clock, Link as LinkIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getUserChannels, updateUserChannels } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';


// --- Types ---
type AccountStatus = 'available' | 'coming_soon';
interface Account {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'meta' | 'email' | 'future';
    status: AccountStatus;
}

// --- Initial Data ---
const initialAccounts: Account[] = [
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Enable Instagram for post generation and analytics.',
        icon: '/instagram.svg',
        category: 'meta',
        status: 'available'
    },
    {
        id: 'facebook',
        name: 'Facebook',
        description: 'Enable Facebook for content scheduling and insights.',
        icon: '/facebook.svg',
        category: 'meta',
        status: 'available'
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Enable WhatsApp to engage with customers.',
        icon: '/whatsapp.svg',
        category: 'meta',
        status: 'available'
    },
    {
        id: 'telegram',
        name: 'Telegram',
        description: 'Enable Telegram for messaging and automations.',
        icon: '/telegram.svg',
        category: 'meta',
        status: 'available'
    },
    {
        id: 'webmail',
        name: 'Webmail',
        description: 'Enable email to send newsletters and sequences.',
        icon: '/mail.svg',
        category: 'email',
        status: 'available'
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        description: 'Plan and analyze your TikTok content strategy.',
        icon: '/tiktok.svg',
        category: 'future',
        status: 'coming_soon'
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Manage your professional presence and content on LinkedIn.',
        icon: '/linkedin.svg',
        category: 'future',
        status: 'coming_soon'
    }
];

// --- Account Card Component ---
const AccountCard = ({ 
    account, 
    isChecked,
    onCheckedChange
}: { 
    account: Account,
    isChecked: boolean,
    onCheckedChange: (checked: boolean) => void;
}) => {
    const isDisabled = account.status === 'coming_soon';

    return (
        <Card className="flex flex-col">
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
                 {isDisabled && (
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
                        checked={isChecked}
                        onCheckedChange={onCheckedChange}
                        disabled={isDisabled}
                    />
                    <Label
                        htmlFor={`check-${account.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                       {isChecked ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
            </CardFooter>
        </Card>
    )
}

// --- Main Page Component ---
export default function AccountsPage() {
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        async function fetchChannels() {
            try {
                const channels = await getUserChannels();
                setSelectedChannels(new Set(channels));
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error fetching channels',
                    description: error.message
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchChannels();
    }, [toast]);
    
    const handleChannelToggle = (channelId: string, checked: boolean) => {
        startSaving(async () => {
            const newSelectedChannels = new Set(selectedChannels);
            if (checked) {
                newSelectedChannels.add(channelId);
            } else {
                newSelectedChannels.delete(channelId);
            }
            setSelectedChannels(newSelectedChannels);
            
            try {
                await updateUserChannels(Array.from(newSelectedChannels));
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
                // Revert state on failure
                const revertedChannels = new Set(selectedChannels);
                 if (checked) {
                    revertedChannels.delete(channelId);
                } else {
                    revertedChannels.add(channelId);
                }
                setSelectedChannels(revertedChannels);
            }
        });
    };

    const renderCard = (account: Account) => (
        <AccountCard 
            key={account.id} 
            account={account} 
            isChecked={selectedChannels.has(account.id)}
            onCheckedChange={(checked) => handleChannelToggle(account.id, !!checked)}
        />
    )

    const metaAccounts = initialAccounts.filter(a => a.category === 'meta');
    const emailAccounts = initialAccounts.filter(a => a.category === 'email');
    const futureAccounts = initialAccounts.filter(a => a.category === 'future');

     if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                     <Skeleton className="h-12 w-1/3" />
                     <Skeleton className="h-8 w-2/3" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        <Skeleton className="h-56 w-full" />
                        <Skeleton className="h-56 w-full" />
                        <Skeleton className="h-56 w-full" />
                     </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <Toaster />
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
                        <h2 className="text-2xl font-semibold mb-4">Email</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {emailAccounts.map(renderCard)}
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
