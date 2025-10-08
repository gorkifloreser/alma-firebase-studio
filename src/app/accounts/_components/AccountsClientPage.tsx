
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Edit, Save, Link, CheckCircle2, AlertCircle, Instagram, Facebook } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { updateUserChannels, updateChannelBestPractices, getMetaOAuthUrl, disconnectMetaAccount, SocialConnection, setActiveConnection, getSocialConnections } from '../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type AccountStatus = 'available' | 'coming_soon';

export interface Account {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'social' | 'messaging' | 'owned' | 'future';
    status: AccountStatus;
    best_practices: string | null;
}


const initialAccounts: Omit<Account, 'best_practices'>[] = [
    { id: 'instagram', name: 'Instagram', description: 'Enable Instagram for post generation and analytics.', icon: '/instagram.svg', category: 'social', status: 'available' },
    { id: 'facebook', name: 'Facebook', description: 'Enable Facebook for content scheduling and insights.', icon: '/facebook.svg', category: 'social', status: 'available' },
    { id: 'tiktok', name: 'TikTok', description: 'Plan and analyze your TikTok content strategy.', icon: '/tiktok.svg', category: 'social', status: 'coming_soon' },
    { id: 'linkedin', name: 'LinkedIn', description: 'Manage your professional presence and content on LinkedIn.', icon: '/linkedin.svg', category: 'social', 'status': 'coming_soon' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'Enable WhatsApp to engage with customers.', icon: '/whatsapp.svg', category: 'messaging', status: 'available' },
    { id: 'telegram', name: 'Telegram', description: 'Enable Telegram for messaging and automations.', icon: '/telegram.svg', category: 'messaging', status: 'available' },
    { id: 'webmail', name: 'Webmail', description: 'Enable email to send newsletters and sequences.', icon: '/mail.svg', category: 'owned', status: 'available' },
    { id: 'website', name: 'Website/Blog', description: 'Enable for landing pages and SEO content.', icon: '/globe.svg', category: 'owned', status: 'available' },
];

interface AccountsClientPageProps {
    initialUserChannels: Account[];
    socialConnections: SocialConnection[];
    updateUserChannelsAction: typeof updateUserChannels;
    updateChannelBestPracticesAction: typeof updateChannelBestPractices;
    getMetaOAuthUrl: typeof getMetaOAuthUrl;
    disconnectMetaAccount: typeof disconnectMetaAccount;
    setActiveConnection: typeof setActiveConnection;
    getSocialConnections: typeof getSocialConnections;
}

const BestPracticesEditor = ({ channelId, initialValue, onSave, isSaving }: { channelId: string, initialValue: string, onSave: (channelId: string, newValue: string) => void, isSaving: boolean }) => {
    const [value, setValue] = useState(initialValue);
    const [isDirty, setIsDirty] = useState(false);

    const handleSave = () => {
        onSave(channelId, value);
        setIsDirty(false);
    }
    
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>AI Best Practices</AccordionTrigger>
                <AccordionContent className="space-y-4">
                    <Textarea 
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value)
                            setIsDirty(true);
                        }}
                        className="h-48 text-xs font-mono"
                    />
                    <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                        {isSaving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Best Practices</>}
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}

export function AccountsClientPage({ 
    initialUserChannels, 
    socialConnections: initialSocialConnections,
    updateUserChannelsAction, 
    updateChannelBestPracticesAction,
    getMetaOAuthUrl,
    disconnectMetaAccount,
    setActiveConnection,
    getSocialConnections,
}: AccountsClientPageProps) {
    const [userChannels, setUserChannels] = useState<Account[]>(initialUserChannels);
    const [socialConnections, setSocialConnections] = useState<SocialConnection[]>(initialSocialConnections);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const handleSetActiveConnection = async (connectionId: number) => {
        startSaving(async () => {
            try {
                const newConnections = await setActiveConnection(connectionId);
                setSocialConnections(newConnections);
                toast({ title: 'Active Account Switched', description: 'Your active publishing account has been updated.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to switch account', description: error.message });
            }
        });
    }
    
    const accountsWithData: Account[] = initialAccounts.map(baseAccount => {
        const userData = userChannels.find(uc => uc.id === baseAccount.id);
        return {
            ...baseAccount,
            best_practices: userData?.best_practices || null,
        }
    });

    const selectedChannels = new Set(userChannels.map(uc => uc.id));

    const handleChannelToggle = (channelId: string, checked: boolean) => {
        const newSelectedChannels = new Set(selectedChannels);
        if (checked) {
            newSelectedChannels.add(channelId);
        } else {
            newSelectedChannels.delete(channelId);
        }
        
        startSaving(async () => {
            try {
                const updatedChannels = await updateUserChannelsAction(Array.from(newSelectedChannels));
                setUserChannels(updatedChannels);
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

    const handleSaveBestPractices = (channelId: string, newValue: string) => {
        startSaving(async () => {
             try {
                const updatedChannel = await updateChannelBestPracticesAction(channelId, newValue);
                setUserChannels(prev => prev.map(c => c.id === channelId ? updatedChannel : c));
                toast({
                    title: 'Best Practices Saved',
                    description: `AI instructions for ${channelId} have been updated.`
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Failed to save',
                    description: error.message
                });
            }
        });
    };
    
    const handleMetaConnect = async () => {
        try {
            const { url } = await getMetaOAuthUrl();
            window.location.href = url;
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Failed to connect to Meta',
                description: error.message,
            });
        }
    };
    
    const handleMetaDisconnect = async () => {
        startSaving(async () => {
            try {
                await disconnectMetaAccount('meta');
                const newConnections = await getSocialConnections();
                setSocialConnections(newConnections);
                toast({
                    title: 'Disconnected from Meta',
                    description: 'Your Meta account connections have been removed.',
                });
            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Failed to disconnect',
                    description: error.message,
                });
            }
        });
    };
    
    const metaConnections = socialConnections.filter(sc => sc.provider === 'meta');
    const activeMetaConnection = metaConnections.find(sc => sc.is_active);

    const renderCard = (account: Account) => {
        const isMetaAccount = account.id === 'instagram' || account.id === 'facebook';

        return (
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
                <CardContent className="flex-grow space-y-4">
                     {account.status === 'coming_soon' && (
                        <div className="flex items-center gap-2 rounded-md bg-secondary p-3">
                             <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-secondary-foreground">
                               Coming Soon
                            </p>
                        </div>
                    )}

                    {isMetaAccount && account.status === 'available' && (
                        metaConnections.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900/30 p-3">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Connected
                                    </p>
                                </div>
                                <Select
                                    value={activeMetaConnection?.id?.toString()}
                                    onValueChange={(value) => handleSetActiveConnection(Number(value))}
                                    disabled={isSaving}
                                >
                                    <SelectTrigger>
                                        <SelectValue asChild>
                                             <div className="flex items-center gap-2">
                                                {activeMetaConnection?.account_picture_url && (
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={activeMetaConnection.account_picture_url} />
                                                        <AvatarFallback>{activeMetaConnection.account_name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <span>@{activeMetaConnection?.account_name || 'Select account...'}</span>
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {metaConnections.map(conn => (
                                            <SelectItem key={conn.id} value={conn.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    {conn.account_picture_url && (
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={conn.account_picture_url} />
                                                            <AvatarFallback>{conn.account_name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <span>@{conn.account_name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                 <Button variant="link" size="sm" onClick={handleMetaDisconnect} className="p-0 h-auto text-destructive" disabled={isSaving}>
                                    Disconnect Meta Account
                                </Button>
                            </div>
                        ) : (
                             <Button onClick={handleMetaConnect} className="w-full">
                                <Link className="mr-2 h-4 w-4" /> Connect with Meta
                            </Button>
                        )
                    )}

                    {selectedChannels.has(account.id) && account.best_practices !== null && !isMetaAccount && (
                        <BestPracticesEditor 
                            channelId={account.id} 
                            initialValue={account.best_practices}
                            onSave={handleSaveBestPractices}
                            isSaving={isSaving}
                        />
                    )}
                </CardContent>
                {!(isMetaAccount || account.status === 'coming_soon') && (
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
                )}
            </Card>
        );
    }


    const socialAccounts = accountsWithData.filter(a => a.category === 'social');
    const messagingAccounts = accountsWithData.filter(a => a.category === 'messaging');
    const ownedAccounts = accountsWithData.filter(a => a.category === 'owned');

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Accounts & Integrations</h1>
                <p className="text-muted-foreground">Select your active marketing channels and customize their AI instructions.</p>
            </header>
            <div className="space-y-8">
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Social</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {socialAccounts.map(renderCard)}
                    </div>
                </section>
                <Separator />
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Messaging</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {messagingAccounts.map(renderCard)}
                    </div>
                </section>
                 <Separator />
                <section>
                    <h2 className="text-2xl font-semibold mb-4">Owned Media</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ownedAccounts.map(renderCard)}
                    </div>
                </section>
            </div>
        </div>
    );
}
