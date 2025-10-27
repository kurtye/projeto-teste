'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Info, Server, Phone, Mail, Beer, Copy } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const servers = [
  { name: 'HRB', url: 'https://stats.hrb-hll.com.br/games' },
  { name: 'RZN', url: 'https://rzn-stats.crcon.cc/games' },
  { name: '3LPZ', url: 'https://3lpz-stats.hlladmin.com/games' },
  { name: 'OCL', url: 'https://ocabala-stats.hlladmin.com/games' },
  { name: 'GOAT', url: 'https://goat-stats.hlladmin.com/games' },
];

const pixKey = '00020126330014br.gov.bcb.pix0111007235441075204000053039865802BR5925MARLON HENRIQUE RAMALHO A6009SAO PAULO62580520SAN2025102700304547650300017br.gov.bcb.brcode01051.0.06304FD3D';

export default function SobrePage() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copiado!',
        description: 'A chave PIX foi copiada para a área de transferência.',
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Info className="h-8 w-8 text-accent" />
          Sobre o Projeto
        </h1>
        <p className="text-muted-foreground mt-2">
          Informações, fontes de dados e formas de contato.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Server className="h-6 w-6" />
                    Fontes dos Dados
                    </CardTitle>
                    <CardDescription>
                    As estatísticas são extraídas publicamente dos seguintes servidores da comunidade:
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                    {servers.map((server) => (
                        <li key={server.name}>
                        <Link href={server.url} target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-accent/80">
                           {server.name} - Estatísticas
                        </Link>
                        </li>
                    ))}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Phone className="h-6 w-6" />
                    Contato
                    </CardTitle>
                    <CardDescription>
                    Para sugestões, dúvidas ou relatar um problema.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <a href="mailto:marlonhrafonso@gmail.com" className="font-mono hover:underline">
                            marlonhrafonso@gmail.com
                        </a>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span className="font-mono">+55 11 950311208</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Beer className="h-6 w-6 text-yellow-400" />
                Quer me pagar uma breja?
                </CardTitle>
                <CardDescription>
                Se você curte o projeto, considere fazer uma contribuição para ajudar a manter os custos do servidor.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center text-center space-y-4">
                 <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center p-2">
                    <Image src="/pix.png" alt="QR Code PIX" width={180} height={180} className="rounded-md" />
                </div>
                <p className="text-muted-foreground text-sm">Ou use o Pix Copia e Cola:</p>
                 <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                    <textarea
                      readOnly
                      className="w-full text-xs p-2 rounded-md bg-muted/50 border text-center h-24 resize-none"
                      value={pixKey}
                    />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(pixKey)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Chave
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
