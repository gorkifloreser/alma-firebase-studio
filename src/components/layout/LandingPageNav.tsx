
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingPageNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link href="#hero" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
            <div className="relative h-full w-full">
              <div className="p-1.5 relative h-full w-full">
                <Image src="/regen-logo-light.svg" alt="Regen MKT Logo" fill />
              </div>
            </div>
          </div>
          <span className="font-bold text-lg">Regen MKT</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="#problem" className="text-sm font-medium hover:text-primary transition-colors">
            The Problem
          </Link>
          <Link href="#solution" className="text-sm font-medium hover:text-primary transition-colors">
            Solution
          </Link>
          <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild className="btn-auth hidden sm:flex">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
