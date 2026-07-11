'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { CategoryFormDialog, type CategoryFormSubmitValues } from '@/components/admin/categories/CategoryFormDialog';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/lib/hooks/useCategories';
import type { Category } from '@/types/category';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function flattenCategories(categories: Category[], depth = 0): { category: Category; depth: number }[] {
  return categories.flatMap((category) => [
    { category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function collectDescendantIds(category: Category): Set<number> {
  const ids = new Set<number>();
  for (const child of category.children ?? []) {
    ids.add(child.id);
    for (const id of collectDescendantIds(child)) ids.add(id);
  }
  return ids;
}

export function CategoriesView() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [formTarget, setFormTarget] = useState<Category | null | undefined>(undefined); // undefined = closed
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const flat = useMemo(() => flattenCategories(categories ?? []), [categories]);

  // Exclude the category being edited and its own descendants from the
  // parent picker — choosing either would be a cycle. The backend rejects
  // this too, but there's no reason to let the form offer an invalid pick.
  const parentOptions = useMemo(() => {
    const excluded = new Set<number>();
    if (formTarget) {
      excluded.add(formTarget.id);
      for (const id of collectDescendantIds(formTarget)) excluded.add(id);
    }
    return flat
      .filter(({ category }) => !excluded.has(category.id))
      .map(({ category, depth }) => ({ id: category.id, name: category.name, depth }));
  }, [flat, formTarget]);

  function handleSubmit(values: CategoryFormSubmitValues) {
    if (formTarget) {
      updateMutation.mutate(
        {
          id: formTarget.id,
          input: {
            name: values.name,
            slug: values.slug || undefined,
            description: values.description || undefined,
            parent_id: values.parentId,
            icon: values.icon || undefined,
            sort_order: values.sortOrder,
          },
        },
        {
          onSuccess: () => {
            toast.success('Category updated.');
            setFormTarget(undefined);
          },
          onError: (error) => toast.error(errorMessage(error, 'Could not update this category.')),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        parent_id: values.parentId ?? undefined,
        icon: values.icon || undefined,
        sort_order: values.sortOrder,
      },
      {
        onSuccess: () => {
          toast.success('Category created.');
          setFormTarget(undefined);
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not create this category.')),
      },
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Categories</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the topic taxonomy shown on the public Categories page and browse filters.
          </p>
        </div>
        <Button onClick={() => setFormTarget(null)}>
          <Plus className="size-4" aria-hidden="true" />
          New category
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <EmptyState title="Couldn't load categories" action={<Button onClick={() => void refetch()}>Retry</Button>} />
        ) : flat.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create the first one to start organizing resources by topic."
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {flat.map(({ category, depth }) => (
              <div key={category.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                  <p className="truncate text-sm font-medium">
                    {category.icon ? <span className="mr-1.5">{category.icon}</span> : null}
                    {category.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{category.slug}
                    {category.description ? ` — ${category.description}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setFormTarget(category)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(category)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryFormDialog
        category={formTarget ?? null}
        open={formTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setFormTarget(undefined);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
        parentOptions={parentOptions}
        onSubmit={handleSubmit}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description="Categories that still have resources or subcategories can't be deleted — move or remove those first."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Category deleted.');
              setDeleteTarget(null);
            },
            onError: (error) => toast.error(errorMessage(error, 'Could not delete this category.')),
          });
        }}
      />
    </PageContainer>
  );
}
