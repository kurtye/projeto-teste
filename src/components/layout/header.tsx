'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';

export function Header() {
  const { isMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between space-x-4">
        <div className="flex gap-2 md:gap-4 items-center">
          {!isMobile && <SidebarTrigger className="md:hidden" />}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.jpg"
              alt="Hell Let Loose BR Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-bold font-headline text-lg">
              Hell Let Loose BR
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
