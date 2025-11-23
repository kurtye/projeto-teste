
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { articles } from '@/lib/articles.tsx';


export default function CasernaPage() {
  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-accent" />
          Caserna BR
        </h1>
        <p className="text-muted-foreground mt-2">
          Dicas, estratégias e artigos para a comunidade de Hell Let Loose.
        </p>
      </div>

      <div className="grid gap-8">
        {articles.map((article) => (
          <Card key={article.slug} className="bg-card/50 backdrop-blur-sm transition-all hover:border-accent">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-headline">{article.title}</CardTitle>
              <CardDescription className="pt-1">{article.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {article.description}
              </p>
               <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map(tag => (
                    <span key={tag} className="text-xs font-semibold bg-accent/20 text-accent-foreground py-1 px-3 rounded-full">
                        {tag}
                    </span>
                ))}
            </div>
            </CardContent>
            <CardFooter>
               <Button asChild variant="outline">
                   <Link href={`/caserna/${article.slug}`}>
                        Ler Artigo <ChevronRight className="h-4 w-4 ml-2" />
                   </Link>
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
