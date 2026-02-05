
'use client';

import { usePathname, useRouter } from 'next/navigation';
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
      return; // Wait until user loading is complete
    }
    if (user) {
      const adminClan = clans.find(c => c.adminEmails.includes(user.email || ''));
      setClan(adminClan || null);
    } else {
      setClan(null);
    }
    setIsAuthenticating(false);
  }, [user, isUserLoading]);

  useEffect(() => {
    if (isAuthenticating) {
      return; // Don't redirect until authentication check is complete
    }

    const onLoginPage = pathname === '/clan-admin/login';
    const hasAdminAccess = !!user && !!clan;

    if (hasAdminAccess) {
      if (onLoginPage) {
        router.replace(`/clan-admin/dashboard/${clan.id}`);
      }
    } else {
      if (!onLoginPage) {
        const error = user ? 'not_admin' : undefined;
        const redirectUrl = error ? `/clan-admin/login?error=${error}` : '/clan-admin/login';
        router.replace(redirectUrl);
      }
    }
  }, [isAuthenticating, user, clan, pathname, router]);

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
  
  // Allow access to login page even if not authenticated
  if (pathname === '/clan-admin/login') {
     return <ClanAuthContext.Provider value={contextValue}>{children}</ClanAuthContext.Provider>;
  }

  // If authenticated but trying to access a non-dashboard page, redirect
  if (isAuthenticated && !pathname.startsWith(`/clan-admin/dashboard/${clan.id}`)) {
    router.replace(`/clan-admin/dashboard/${clan.id}`);
    return null;
  }
  
  // If not authenticated and not on login page, wait for redirect
  if (!isAuthenticated && pathname !== '/clan-admin/login') {
     return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="text-xl">Redirecionando para o login...</div>
        </div>
      );
  }

  return (
    <ClanAuthContext.Provider value={contextValue}>
      {children}
    </ClanAuthContext.Provider>
  );
}
