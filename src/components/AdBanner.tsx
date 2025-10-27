
'use client';

import { cn } from "@/lib/utils";
import { useEffect } from "react";

// Tipagem para as propriedades do objeto 'adsbygoogle' no window
declare global {
  interface Window {
    adsbygoogle?: {
      push: (params: object) => void;
    }[];
  }
}

export const AdBanner = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense script failed to load or push:", err);
    }
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-24 w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground",
        className
      )}
    >
      {children || (
        <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-semibold">Publicidade</p>
            <p className="text-xs">Este espaço está reservado para anúncios.</p>
        </div>
      )}
    </div>
  );
};
