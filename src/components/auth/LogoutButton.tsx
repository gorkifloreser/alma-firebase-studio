
"use client";

import { Button } from '@/components/ui/button';
import { logout } from './actions';
import { LogOut } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

export function LogoutButton() {
    const { state } = useSidebar();
  return (
    <form action={logout} className="w-full">
      <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
        <LogOut className="h-5 w-5" />
        {state === 'expanded' && <span>Logout</span>}
      </Button>
    </form>
  );
}
