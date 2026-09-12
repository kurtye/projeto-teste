'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, ReactNode, useMemo } from 'react';
import { clans } from '@/lib/clans';

interface ClanAuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: any | null;
  clan: (typeof clans)[0] | null;
  login: (email:string, password: string) => Promise<{success: boolean, error?: string}>;
  logout: () => void;
}

const ClanAuthContext = createContext<ClanAuthContextType | null>(null);

export const useClanAuth = () => {
  const context = useContext(ClanAuthContext);
  if (!context) {
    throw new Error('useClanAuth must be used within a ClanAdminLayout');
  }
  return context;
};

export default function ClanAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const pathParts = pathname.split('/');
  const clanIdFromPath = pathParts.length >= 4 ? pathParts[3] : null;
  
  const clan = useMemo(() => {
     if (!clanIdFromPath) return null;
     return clans.find(c => c.id === clanIdFromPath) || null;
  }, [clanIdFromPath]);

  const contextValue = useMemo(() => ({
    isAuthenticated: true,
    isAuthenticating: false,
    user: { email: 'public_access' },
    clan: clan || clans[0],
    login: async () => ({ success: true }),
    logout: () => { router.push('/') }
  }), [clan, router]);

  return (
    <ClanAuthContext.Provider value={contextValue}>
      {children}
    </ClanAuthContext.Provider>
  );
}
