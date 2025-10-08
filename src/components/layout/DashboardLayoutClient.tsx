
'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  CreditCard,
  BarChart2,
  Heart,
  ShoppingBag,
  BrainCircuit,
  Calendar,
  GitBranch,
  Wand2,
  Star,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { UserNav } from '@/components/auth/UserNav';
import { cn } from '@/lib/utils';

const menuItems = [
    { href: '/', label: 'User Guide', icon: LayoutDashboard },
    { href: '/brand', label: 'Brand Heart', icon: Heart },
    { href: '/offerings', label: 'Offerings', icon: ShoppingBag },
    { href: '/funnels', label: 'AI Strategist', icon: GitBranch },
    { href: '/artisan', label: 'AI Artisan', icon: Wand2 },
    { href: '/calendar', label: 'AI Scheduler', icon: Calendar },
    { href: '/harvest-circle', label: 'Harvest Circle', icon: Star },
];

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[DashboardLayoutClient] Step 1: Component rendering on the client.');
  const pathname = usePathname();
  console.log(`[DashboardLayoutClient] Step 2: usePathname hook executed. Current path: ${pathname}`);

  return (
    <SidebarProvider>
      {console.log('[DashboardLayoutClient] Step 3: SidebarProvider rendered.')}
      <div className="flex min-h-screen bg-background">
        <Sidebar collapsible="icon" className={cn("group-data-[variant=inset]:hidden", "bg-transparent")}>
          <SidebarHeader className="h-16 flex items-center justify-between p-4">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <div className="bg-primary rounded-lg p-1.5">
                   <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">alma AI</span>
              </div>
               <div className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
                <div className="bg-primary rounded-lg p-1.5">
                   <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {menuItems.map((item, index) => {
                console.log(`[DashboardLayoutClient] Step 4.${index}: Rendering menu item: ${item.label}`);
                const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
                return (
                    <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                        href={item.href}
                        isActive={isActive}
                        asChild
                        tooltip={item.label}
                    >
                    <a href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </a>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                );
                })}
            </SidebarMenu>

             <div className="mt-auto p-4 group-data-[collapsible=icon]:hidden">
                <Card className="rounded-2xl bg-black/10 text-center p-4 border-none text-sidebar-foreground backdrop-blur-sm">
                    <p className="font-bold">Join our waiting list</p>
                    <Button size="sm" className="mt-4 btn-primary-gradient">Join Now</Button>
                </Card>
             </div>

          </SidebarContent>
        </Sidebar>
        <main className="flex-1">
          <header className="h-16 flex items-center justify-between px-4 border-b">
              {console.log('[DashboardLayoutClient] Step 5: Rendering SidebarTrigger.')}
              <SidebarTrigger />
              {console.log('[DashboardLayoutClient] Step 6: Rendering UserNav.')}
              <UserNav />
          </header>
          {console.log('[DashboardLayoutClient] Step 7: Rendering children.')}
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
