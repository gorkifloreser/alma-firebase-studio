import * as React from 'react';
import {
  SidebarProvider,
} from '@/components/ui/sidebar';
import { DashboardLayoutClient } from './DashboardLayoutClient';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </SidebarProvider>
  );
}
