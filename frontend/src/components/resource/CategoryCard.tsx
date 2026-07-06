import Link from 'next/link';
import { Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants/routes';
import type { Category } from '@/types/category';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={ROUTES.category(category.slug)}>
      <Card className="h-full transition-colors hover:border-brand/40">
        <CardContent className="flex items-center gap-3 py-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Folder className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">{category.name}</p>
            {category.description ? (
              <p className="line-clamp-1 text-sm text-muted-foreground">{category.description}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
