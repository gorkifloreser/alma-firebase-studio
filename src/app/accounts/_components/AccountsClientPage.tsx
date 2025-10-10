
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Edit, Save, Link, CheckCircle2, AlertCircle, Instagram, Facebook, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { updateUserChannels, updateChannelBestPractices, getMetaOAuthUrl, disconnectMetaAccount, UserChannelSetting, setActiveConnection, getUserChannels, SocialConnection } from '../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type AccountStatus = 'available' | 'coming_soon';

export interface BaseAccount {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'social' | 'messaging' | 'owned' | 'future';
    status: AccountStatus;
}

const initialAccounts: BaseAccount[] = [
    { id: 'instagram', name: 'Instagram', description: 'Enable Instagram for post generation and analytics.', icon: '/instagram.svg', category: 'social', status: 'available' },
    { id: 'facebook', name: 'Facebook', description: 'Enable Facebook for content scheduling and insights.', icon: '/facebook.svg', category: 'social', status: 'available' },
    { id: 'tiktok', name: 'TikTok', description: 'Plan and analyze your TikTok content strategy.', icon: '/tiktok.svg', category: 'social', status: 'coming_soon' },
    { id: 'linkedin', name: 'LinkedIn', description: 'Manage your professional presence and content on LinkedIn.', icon: '/linkedin.svg', category: 'social', status: 'coming_soon' },
    { id: 'x', name: 'X (Twitter)', description: 'Schedule threads and analyze your presence on X.', icon: '/x.svg', category: 'social', status: 'coming_soon' },
    { id: 'youtube', name: 'YouTube', description: 'Analyze video performance and plan content.', icon: '/youtube.svg', category: 'social', status: 'coming_soon' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'Enable WhatsApp to engage with customers.', icon: '/whatsapp.svg', category: 'messaging', status: 'available' },
    { id: 'telegram', name: 'Telegram', description: 'Enable Telegram for messaging and automations.', icon: '/telegram.svg', category: 'messaging', status: 'coming_soon' },
    { id: 'webmail', name: 'Webmail', description: 'Enable email to send newsletters and sequences.', icon: '/mail.svg', category: 'owned', status: 'available' },
    { id: 'website', name: 'Website/Blog', description: 'Enable for landing pages and SEO content.', icon: '/globe.svg', category: 'owned', status: 'available' },
];

interface AccountsClientPageProps {
    initialUserChannels: UserChannelSetting[];
    updateUserChannelsAction: typeof updateUserChannels;
    updateChannelBestPracticesAction: typeof updateChannelBestPractices;
    getMetaOAuthUrl: typeof getMetaOAuthUrl;
    disconnectMetaAccount: typeof disconnectMetaAccount;
    setActiveConnection: typeof setActiveConnection;
    getUserChannels: typeof getUserChannels;
}

const BestPracticesEditor = ({ channelId, initialValue, onSave, isSaving }: { channelId: number, initialValue: string, onSave: (channelId: number, newValue: string) => void, isSaving: boolean }) => {
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
    updateUserChannelsAction, 
    updateChannelBestPracticesAction,
    getMetaOAuthUrl,
    disconnectMetaAccount,
    setActiveConnection,
    getUserChannels,
}: AccountsClientPageProps) {
    const [userChannels, setUserChannels] = useState<UserChannelSetting[]>(initialUserChannels);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const handleSetActiveConnection = async (channelId: number, accountId: string) => {
        startSaving(async () => {
            try {
                const newChannelSetting = await setActiveConnection(channelId, accountId);
                setUserChannels(prev => prev.map(c => c.id === channelId ? newChannelSetting : c));
                toast({ title: 'Active Account Switched', description: 'Your active publishing account has been updated.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to switch account', description: error.message });
            }
        });
    }
    
    const selectedChannels = new Set(userChannels.map(uc => uc.channel_name));

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

    const handleSaveBestPractices = (channelId: number, newValue: string) => {
        startSaving(async () => {
             try {
                const updatedChannel = await updateChannelBestPracticesAction(channelId, newValue);
                setUserChannels(prev => prev.map(c => c.id === channelId ? updatedChannel : c));
                toast({
                    title: 'Best Practices Saved',
                    description: `AI instructions for channel have been updated.`
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
    
    const handleMetaDisconnect = (provider: 'facebook' | 'instagram') => {
        startSaving(async () => {
            try {
                await disconnectMetaAccount(provider);
                const newChannels = await getUserChannels();
                setUserChannels(newChannels);
                toast({
                    title: `Disconnected from ${provider}`,
                    description: 'Your account connection has been removed.',
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
    
    const renderCard = (baseAccount: BaseAccount) => {
        const channelSetting = userChannels.find(uc => uc.channel_name === baseAccount.id);
        const isEnabled = !!channelSetting;
        const isMetaSocial = baseAccount.id === 'instagram' || baseAccount.id === 'facebook';
        
        const connections = (channelSetting?.connections || []).filter(c => c.provider === baseAccount.id);
        const activeConnection = connections.find(c => c.is_active);
        const hasAnyMetaConnection = connections.length > 0;

        return (
            <Card key={baseAccount.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start gap-4">
                    <div className="relative h-10 w-10 flex-shrink-0">
                        <Image src={baseAccount.icon} alt={`${baseAccount.name} logo`} fill />
                    </div>
                    <div>
                        <CardTitle>{baseAccount.name}</CardTitle>
                        <CardDescription>{baseAccount.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                     {baseAccount.status === 'coming_soon' && (
                        <div className="flex items-center gap-2 rounded-md bg-secondary p-3">
                             <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium text-secondary-foreground">
                               Coming Soon
                            </p>
                        </div>
                    )}

                    {isMetaSocial && baseAccount.status === 'available' && (
                        hasAnyMetaConnection ? (
                             <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900/30 p-3">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Connected to Meta
                                    </p>
                                </div>
                                {connections.length > 0 ? (
                                    <Select
                                        value={activeConnection?.account_id}
                                        onValueChange={(value) => handleSetActiveConnection(channelSetting.id, value)}
                                        disabled={isSaving}
                                    >
                                        <SelectTrigger>
                                            <SelectValue asChild>
                                                 <div className="flex items-center gap-2">
                                                    {activeConnection?.account_picture_url ? (
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={activeConnection.account_picture_url} />
                                                            <AvatarFallback>{activeConnection.account_name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                    ) : <Instagram className="h-5 w-5" />}
                                                    <span>{activeConnection?.account_name || `Select account...`}</span>
                                                </div>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {connections.map(conn => (
                                                <SelectItem key={conn.account_id} value={conn.account_id}>
                                                    <div className="flex items-center gap-2">
                                                        {conn.account_picture_url ? (
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={conn.account_picture_url} />
                                                                <AvatarFallback>{conn.account_name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                        ) : <Instagram className="h-5 w-5" />}
                                                        <span>{conn.account_name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No accounts found for this channel.</p>
                                )}
                                 <Button variant="link" size="sm" onClick={() => handleMetaDisconnect(baseAccount.id as 'facebook' | 'instagram')} className="p-0 h-auto text-destructive" disabled={isSaving}>
                                    Disconnect
                                </Button>
                                 {channelSetting && (
                                     <BestPracticesEditor 
                                        channelId={channelSetting.id} 
                                        initialValue={channelSetting.best_practices}
                                        onSave={handleSaveBestPractices}
                                        isSaving={isSaving}
                                    />
                                 )}
                            </div>
                        ) : (
                             <Button onClick={handleMetaConnect} className="w-full">
                                <Link className="mr-2 h-4 w-4" /> Connect with Meta
                            </Button>
                        )
                    )}

                    {isEnabled && baseAccount.status === 'available' && !isMetaSocial && (
                        <BestPracticesEditor 
                            channelId={channelSetting.id}
                            initialValue={channelSetting.best_practices}
                            onSave={handleSaveBestPractices}
                            isSaving={isSaving}
                        />
                    )}
                </CardContent>
                {baseAccount.status === 'available' && !isMetaSocial && (
                    <CardFooter>
                         <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`check-${baseAccount.id}`}
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleChannelToggle(baseAccount.id, !!checked)}
                                disabled={isSaving}
                            />
                            <Label
                                htmlFor={`check-${baseAccount.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                               {isEnabled ? 'Enabled' : 'Disabled'}
                            </Label>
                        </div>
                    </CardFooter>
                )}
            </Card>
        );
    }

    const socialAccounts = initialAccounts.filter(a => a.category === 'social');
    const messagingAccounts = initialAccounts.filter(a => a.category === 'messaging');
    const ownedAccounts = initialAccounts.filter(a => a.category === 'owned');

    return (
        <div className="space-y-8">
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

    
