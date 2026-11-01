'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-md">
      <div className="container flex h-14 max-w-[1600px] items-center justify-between px-4">
        <Link href="/match-analyzer" className="flex items-center space-x-3 group">
          <Image
            src="/logo.jpg"
            alt="Hell Let Loose BR Logo"
            width={32}
            height={32}
            className="rounded-full ring-1 ring-border group-hover:ring-accent transition-all"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold font-headline text-lg tracking-tight">
              Hell Let Loose BR
            </span>
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider text-muted-foreground border-border/60">
              <Activity className="w-3 h-3 mr-1 text-emerald-400" />
              Match Analyzer
            </Badge>
          </div>
        </Link>
      </div>
    </header>
  );
}
