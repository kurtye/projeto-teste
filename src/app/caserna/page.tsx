
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { articles as hardcodedArticles } from '@/lib/articles.tsx';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

export default function CasernaPage() {
  const firestore = useFirestore();

  const articlesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'articles'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: dbArticles, isLoading } = useCollection(articlesQuery);

  const allArticles = useMemo(() => {
    const list = [...hardcodedArticles];
    if (dbArticles) {
      // Adiciona artigos do banco, evitando duplicatas por slug
      dbArticles.forEach(dbArt => {
        if (!list.find(a => a.slug === dbArt.slug)) {
          list.unshift(dbArt);
        }
      });
    }
    // Ordena por data (mais recente primeiro)
    return list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [dbArticles]);

  return (
    <div className="container mx-auto px-4 py-8 mb-16 md:mb-0">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-accent" />
          Caserna BR
        </h1>
        <p className="text-muted-foreground mt-2">
          Dicas, estratégias e relatórios de inteligência da comunidade de Hell Let Loose.
        </p>
      </div>

      <div className="grid gap-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          allArticles.map((article) => (
            <Card key={article.slug} className="bg-card/50 backdrop-blur-sm transition-all hover:border-accent">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-headline">{article.title}</CardTitle>
                <CardDescription className="pt-1">{article.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3">
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
          ))
        )}
      </div>
    </div>
  );
}
