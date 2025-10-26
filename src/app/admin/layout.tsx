
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AuthContext = createContext<{ isAuthenticated: boolean; login: (password: string) => boolean; }>({
  isAuthenticated: false,
  login: () => false,
});

export const useAuth = () => useContext(AuthContext);

// A senha é carregada da variável de ambiente no momento da build.
// Note que em um ambiente de cliente, as variáveis de ambiente precisam ser prefixadas com NEXT_PUBLIC_
// mas como este layout é um server component que renderiza um client component,
// o Node pode acessar process.env diretamente no momento da renderização inicial.
// Para uma aplicação real, considere uma rota de API para validação.
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'hellletlooseBR';


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
    // Agora compara com a variável de ambiente.
    if (password === ADMIN_PASSWORD) { 
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
