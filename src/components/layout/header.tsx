'use client';

import Link from 'next/link';
import { ArmyHelmetIcon } from '@/components/icons';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <ArmyHelmetIcon className="h-8 w-8 text-primary" />
            <span className="inline-block font-bold font-headline text-lg">
              Hell Let Loose BR
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
