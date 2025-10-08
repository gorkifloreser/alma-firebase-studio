
import { DashboardLayoutClient } from './DashboardLayoutClient';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[DashboardLayout - Server] Rendering server layout wrapper.');
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
