'use client';

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: {
      push: (params: object) => void;
    }[];
  }
}

export const AdBanner = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Stop observing once it's visible
          observer.unobserve(entry.target);
        }
      },
      {
        // Start loading the ad a bit before it's fully in view
        rootMargin: "50px",
      }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => {
      if (adRef.current) {
        observer.unobserve(adRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only push the ad when the component is visible
    if (isIntersecting) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error("AdSense script failed to load or push:", err);
      }
    }
  }, [isIntersecting]);

  return (
    <div
      ref={adRef}
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
