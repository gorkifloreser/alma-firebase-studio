
'use client';

import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  CreditCard,
  Import,
  BarChart2,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Image from 'next/image';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/records', label: 'Records', icon: FileText },
  { href: '/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/imports', label: 'Imports', icon: Import },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar collapsible="icon" className="group-data-[variant=inset]:hidden">
          <SidebarHeader className="h-16 flex items-center justify-between p-4">
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <div className="bg-primary rounded-lg p-1.5">
                   <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">Wallet</span>
              </div>
               <div className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
                <div className="bg-primary rounded-lg p-1.5">
                   <Wallet className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    href={item.href}
                    isActive={pathname === item.href}
                    asChild
                    tooltip={item.label}
                  >
                   <a href={item.href}>
                     <item.icon className="h-5 w-5" />
                     <span>{item.label}</span>
                   </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

             <div className="mt-auto p-4 group-data-[collapsible=icon]:hidden">
                <Card className="rounded-2xl bg-primary/10 text-center p-4 border-none">
                    <p className="font-bold">Join Wallet Life Fourm</p>
                    <Button size="sm" className="mt-4">Join Now</Button>
                </Card>
             </div>

          </SidebarContent>
          <SidebarFooter className="p-2">
             <SidebarMenu>
                 <SidebarMenuItem>
                    <LogoutButton />
                 </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
          <header className="h-16 flex items-center justify-end px-4 border-b lg:hidden">
              <SidebarTrigger />
          </header>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
