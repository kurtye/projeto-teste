'use client';

import Link from 'next/link';
import { ArmyHelmetIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between space-x-4">
        <div className="flex gap-2 md:gap-10 items-center">
          <SidebarTrigger className="md:hidden" />
          <Link href="/" className="flex items-center space-x-2">
            <ArmyHelmetIcon className="h-8 w-8 text-primary" />
            <span className="hidden md:inline-block font-bold font-headline text-lg">
              Hell Let Loose BR
            </span>
          </Link>
        </div>
        <nav>
          <Button asChild variant="outline">
            <Link href="/admin">
              <Database className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
