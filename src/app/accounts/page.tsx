
'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plug, CheckCircle, Clock, Link as LinkIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// --- Types ---
type AccountStatus = 'disconnected' | 'connected' | 'coming_soon';
interface Account {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'meta' | 'email' | 'future';
    status: AccountStatus;
    connectedPage?: string;
}

// --- Initial Data ---
const initialAccounts: Account[] = [
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Connect your Instagram account to manage posts and view analytics.',
        icon: '/instagram.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        id: 'facebook',
        name: 'Facebook',
        description: 'Connect your Facebook Page for content scheduling and insights.',
        icon: '/facebook.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Connect your WhatsApp Business account to engage with customers.',
        icon: '/whatsapp.svg',
        category: 'meta',
        status: 'disconnected'
    },
    {
        id: 'webmail',
        name: 'Webmail',
        description: 'Connect your email account to send newsletters and sequences.',
        icon: '/mail.svg',
        category: 'email',
        status: 'disconnected'
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

// --- Sample Data for Connection Dialog ---
const samplePages = {
    instagram: [
        { id: 'insta-1', name: '@conscious_creator_designs' },
        { id: 'insta-2', name: '@soulful_brand_official' },
    ],
    facebook: [
        { id: 'fb-1', name: 'Conscious Creator Designs Co.' },
        { id: 'fb-2', name: 'Soulful Brand Community' },
        { id: 'fb-3', name: 'My Personal Art Page' },
    ]
}

// --- Connection Card Component ---
const ConnectionCard = ({ 
    account, 
    onConnect,
    onDisconnect
}: { 
    account: Account,
    onConnect: (accountId: string) => void;
    onDisconnect: (accountId: string) => void;
}) => {
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
                {account.status === 'connected' && account.connectedPage && (
                    <div className="flex items-center gap-2 rounded-md bg-secondary p-3">
                        <LinkIcon className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-secondary-foreground">
                           Linked to: <span className="font-bold">{account.connectedPage}</span>
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 {account.status === 'disconnected' && (
                    <Button onClick={() => onConnect(account.id)}>
                        <Plug className="mr-2 h-4 w-4" />
                        Connect
                    </Button>
                 )}
                 {account.status === 'connected' && (
                    <Button variant="destructive" onClick={() => onDisconnect(account.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect
                    </Button>
                 )}
                 {account.status === 'coming_soon' && (
                    <Button variant="outline" disabled>
                         <Clock className="mr-2 h-4 w-4" />
                        Coming Soon
                    </Button>
                 )}
            </CardFooter>
        </Card>
    )
}

// --- Connection Dialog Component ---
const ConnectDialog = ({
    isOpen,
    onOpenChange,
    accountToConnect,
    onLinkPage
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    accountToConnect: Account | null;
    onLinkPage: (accountId: string, pageName: string) => void;
}) => {
    const [selectedPage, setSelectedPage] = useState<string | null>(null);

    if (!accountToConnect) return null;
    
    const pages = accountToConnect.id in samplePages 
        ? samplePages[accountToConnect.id as keyof typeof samplePages] 
        : [];

    const handleConfirm = () => {
        if (selectedPage) {
            onLinkPage(accountToConnect.id, selectedPage);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Connect to {accountToConnect.name}</DialogTitle>
                    <DialogDescription>
                        Select the page you want to link to Alma.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="page-select">Your Pages</Label>
                        <Select onValueChange={setSelectedPage}>
                            <SelectTrigger id="page-select">
                                <SelectValue placeholder="Select a page..." />
                            </SelectTrigger>
                            <SelectContent>
                                {pages.map(page => (
                                    <SelectItem key={page.id} value={page.name}>{page.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This is a simulation. In a real application, you would be redirected to {accountToConnect.name} to authenticate.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={!selectedPage}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Link Page
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


// --- Main Page Component ---
export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [accountToConnect, setAccountToConnect] = useState<Account | null>(null);
    
    const handleConnect = (accountId: string) => {
        const account = accounts.find(a => a.id === accountId);
        if (account && (account.id === 'instagram' || account.id === 'facebook')) {
            setAccountToConnect(account);
            setIsDialogOpen(true);
        } else {
            // Handle other connection types or show a message
        }
    }

    const handleDisconnect = (accountId: string) => {
        setAccounts(prev => 
            prev.map(acc => 
                acc.id === accountId 
                ? { ...acc, status: 'disconnected', connectedPage: undefined }
                : acc
            )
        );
    }
    
    const handleLinkPage = (accountId: string, pageName: string) => {
        setAccounts(prev => 
            prev.map(acc => 
                acc.id === accountId 
                ? { ...acc, status: 'connected', connectedPage: pageName }
                : acc
            )
        );
        setIsDialogOpen(false);
        setAccountToConnect(null);
    }

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
                                <ConnectionCard key={account.id} account={account} onConnect={handleConnect} onDisconnect={handleDisconnect} />
                            ))}
                        </div>
                    </section>

                    <Separator />

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Email</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {emailAccounts.map(account => (
                                <ConnectionCard key={account.id} account={account} onConnect={handleConnect} onDisconnect={handleDisconnect} />
                            ))}
                        </div>
                    </section>

                    <Separator />

                     <section>
                        <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {futureAccounts.map(account => (
                                <ConnectionCard key={account.id} account={account} onConnect={handleConnect} onDisconnect={handleDisconnect} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>
            <ConnectDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                accountToConnect={accountToConnect}
                onLinkPage={handleLinkPage}
            />
        </DashboardLayout>
    );
}
