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

let adKeyCounter = 0;

export const AdBanner = ({ className, children }: { className?: string, children?: React.ReactNode }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  // Use a unique key for each ad instance to prevent React from reusing the component state incorrectly
  const [adKey] = useState(() => `ad-${adKeyCounter++}`);

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
        // Use a local variable to avoid issues with the ref being null on cleanup
        const currentAdRef = adRef.current;
        observer.unobserve(currentAdRef);
      }
    };
  }, []);

  useEffect(() => {
    if (isIntersecting) {
        // Find the 'ins' element inside the ref
        const adSlot = adRef.current?.querySelector('ins.adsbygoogle');
        
        // Check if AdSense has already processed this slot
        if (adSlot && adSlot.getAttribute('data-ad-status') === 'filled') {
            return;
        }

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
      key={adKey} 
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
