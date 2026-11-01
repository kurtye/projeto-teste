import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Hell Let Loose BR | Analisador de Partidas',
  description: 'Plataforma de análise tática, telemetria, linhas de frente e replays de partidas competitivas de Hell Let Loose.',
  keywords: 'Hell Let Loose, HLL, Match Analyzer, Replay, Telemetria, Brasil, Táticas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Google Analytics */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-5P5ELS9WSX" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5P5ELS9WSX');
          `}
        </Script>
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background text-foreground flex flex-col')}>
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <footer className="w-full border-t border-border/40 py-4 px-6 text-center text-xs text-muted-foreground/80">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Hell Let Loose Brasil • Analisador Tático de Replays</span>
            <span className="font-mono text-[11px] text-muted-foreground/60">HLL Community BR</span>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
