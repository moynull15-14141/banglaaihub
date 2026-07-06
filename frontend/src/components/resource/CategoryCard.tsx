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
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-3 py-2">
          <Folder className="size-5 shrink-0 text-primary" aria-hidden="true" />
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
