import { notFound } from 'next/navigation';
import { articles } from '@/lib/articles.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AdBanner } from '@/components/AdBanner';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = params;
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 mb-16 md:mb-0">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/caserna">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Caserna
          </Link>
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl md:text-4xl font-headline">{article.title}</CardTitle>
          <CardDescription className="pt-2 text-base">
            {article.date}
          </CardDescription>
           <div className="flex flex-wrap gap-2 pt-4">
              {article.tags.map(tag => (
                  <span key={tag} className="text-xs font-semibold bg-accent/20 text-accent-foreground py-1 px-3 rounded-full">
                      {tag}
                  </span>
              ))}
          </div>
        </CardHeader>
        <Separator className="mx-6 w-auto" />
        <CardContent className="py-6">
          <div className="prose prose-invert prose-lg max-w-none text-foreground/90 prose-headings:text-accent prose-headings:font-headline prose-strong:text-foreground">
            {article.content}
          </div>
            <div className="my-8">
              <AdBanner>
                  <ins className="adsbygoogle"
                      style={{ display: 'block' }}
                      data-ad-client="ca-pub-1957003967974734"
                      data-ad-slot="1512951312"
                      data-ad-format="auto"
                      data-full-width-responsive="true"></ins>
              </AdBanner>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export async function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }));
}
