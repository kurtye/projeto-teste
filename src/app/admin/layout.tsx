
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AuthContext = createContext<{ isAuthenticated: boolean; login: (password: string) => boolean; }>({
  isAuthenticated: false,
  login: () => false,
});

export const useAuth = () => useContext(AuthContext);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('isAdminAuthenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    } else {
        if(pathname !== '/admin/login') {
            router.push('/admin/login');
        }
    }
  }, [pathname, router]);

  const login = (password: string): boolean => {
    // In a real app, this should be a call to a server to validate the password
    if (password === 'admin') { 
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setIsAuthenticated(true);
      router.push('/admin/dashboard');
      return true;
    }
    return false;
  };

  if (pathname === '/admin/login') {
     return <AuthContext.Provider value={{ isAuthenticated, login }}>{children}</AuthContext.Provider>;
  }

  if (!isAuthenticated) {
    return null; // or a loading spinner
  }

  return <AuthContext.Provider value={{ isAuthenticated, login }}>{children}</AuthContext.Provider>;
}
