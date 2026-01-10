
'use client';

import { usePathname, useRouter, notFound } from 'next/navigation';
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { clans } from '@/lib/clans';

interface ClanAuthContextType {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: User | null;
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
  const { user, isUserLoading } = useUser();
  const auth = useFirebaseAuth();
  const [clan, setClan] = useState<(typeof clans)[0] | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isUserLoading) {
        setIsAuthenticating(true);
        return;
    }

    if (user) {
        const adminClan = clans.find(c => c.adminEmails.includes(user.email || ''));
        if (adminClan) {
            setClan(adminClan);
        } else {
            setClan(null); // User is logged in but not a clan admin
            if (pathname.startsWith('/clan-admin/dashboard')) {
                router.push('/clan-admin/login?error=not_admin');
            }
        }
    } else {
        setClan(null);
        if (!pathname.includes('/clan-admin/login')) {
            router.push('/clan-admin/login');
        }
    }
    setIsAuthenticating(false);
  }, [user, isUserLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error: any) {
        let errorMessage = "Ocorreu um erro desconhecido.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Email ou senha inválidos.";
        }
        return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    auth.signOut();
    router.push('/clan-admin/login');
  };
  
  const isAuthenticated = !isAuthenticating && !!user && !!clan;

  const contextValue = useMemo(() => ({
    isAuthenticated,
    isAuthenticating,
    user,
    clan,
    login,
    logout
  }), [isAuthenticated, isAuthenticating, user, clan]);

  if (isAuthenticating) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-xl">Verificando acesso...</div>
        </div>
      );
  }

  if (!isAuthenticated && pathname !== '/clan-admin/login') {
    // This part should be handled by the useEffect redirect, but as a fallback:
    return null;
  }
  
  // Allow access to login page even if not authenticated
  if (pathname === '/clan-admin/login' && !isAuthenticated) {
     return <ClanAuthContext.Provider value={contextValue}>{children}</ClanAuthContext.Provider>;
  }

  // If authenticated, but on login page, redirect to dashboard
  if (pathname === '/clan-admin/login' && isAuthenticated) {
    router.replace(`/clan-admin/dashboard/${clan.id}`);
    return null; // Show loading or nothing during redirect
  }
  
  if (!clan && pathname !== '/clan-admin/login') {
     return notFound();
  }

  return (
    <ClanAuthContext.Provider value={contextValue}>
      {children}
    </ClanAuthContext.Provider>
  );
}
