'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FilterSelect } from '@/components/common/FilterSelect';
import type { Category } from '@/types/category';

export interface CategoryFormSubmitValues {
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  icon: string;
  sortOrder: number;
}

interface CategoryFormDialogProps {
  category: Category | null; // null = create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  // Flattened, indented parent choices with the category itself and its own
  // descendants already excluded (CategoriesView computes this — picking a
  // descendant as your own parent would be a cycle, which the backend
  // rejects anyway, but there's no reason to let the UI offer it).
  parentOptions: { id: number; name: string; depth: number }[];
  onSubmit: (values: CategoryFormSubmitValues) => void;
}

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
  isPending,
  parentOptions,
  onSubmit,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '');
      setSlug(category?.slug ?? '');
      setDescription(category?.description ?? '');
      setParentId(category?.parent_id ? String(category.parent_id) : '');
      setIcon(category?.icon ?? '');
      setSortOrder(String(category?.sort_order ?? 0));
    }
  }, [open, category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? `Edit "${category.name}"` : 'Create category'}</DialogTitle>
          <DialogDescription>
            Categories group resources by topic on the public Categories page and the browse filters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bangla NLP"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Auto-generated from the name if left blank"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Shown under the category name on the Categories page."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-parent">Parent category</Label>
            <FilterSelect id="category-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">No parent (top-level)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {'—'.repeat(option.depth)} {option.name}
                </option>
              ))}
            </FilterSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category-icon">Icon</Label>
              <Input
                id="category-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="🧠 or a lucide name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-sort-order">Sort order</Label>
              <Input
                id="category-sort-order"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            disabled={!name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim(),
                parentId: parentId ? Number(parentId) : null,
                icon: icon.trim(),
                sortOrder: Number(sortOrder) || 0,
              })
            }
          >
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
