
'use client';

import { cn } from "@/lib/utils";

export const AdBanner = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold">Publicidade</p>
        <p className="text-xs">Este espaço está reservado para anúncios.</p>
      </div>
    </div>
  );
};
