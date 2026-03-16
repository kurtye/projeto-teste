
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { FirebaseClientProvider } from '@/firebase';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MobileFooter } from '@/components/layout/mobile-footer';
import { Home, Trophy, Briefcase, Info, BookUser, Users, Crosshair } from 'lucide-react';
import { SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Hell Let Loose BR',
  description: 'Global player rankings for Hell Let Loose',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="google-adsense-account" content="ca-pub-1957003967974734"></meta>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1957003967974734"
     crossOrigin="anonymous"></script>

        {/* Google Analytics */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-5P5ELS9WSX"></Script>
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
          
            gtag('config', 'G-5P5ELS9WSX');
          `}
        </Script>
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background text-foreground')}>
        <FirebaseClientProvider>
          <SidebarProvider defaultOpen={false}>
            <Sidebar collapsible="icon">
                <SidebarContent className="py-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Ranking">
                                <Link href="/"><Home /><span>Ranking</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Clãs">
                                <Link href="/clans"><Users /><span>Clãs</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Arsenal">
                                <Link href="/armas"><Crosshair /><span>Arsenal</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Hall da Fama">
                                <Link href="/hall-of-fame"><Trophy /><span>Hall da Fama</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Caserna">
                                <Link href="/caserna"><Briefcase /><span>Caserna</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Sobre">
                                <Link href="/sobre"><Info /><span>Sobre</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Privacidade">
                                <Link href="/politica-de-privacidade"><BookUser /><span>Privacidade</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                <Header />
                <main className="flex-1">{children}</main>
                <MobileFooter />
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
