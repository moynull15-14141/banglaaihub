'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { useMyPinnedResources, useReorderPinnedResources } from '@/lib/hooks/usePinnedResources';
import type { Resource } from '@/types/resource';

function SortablePinnedCard({ resource }: { resource: Resource }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: resource.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-60' : undefined}
    >
      <div className="relative">
        <button
          type="button"
          className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <ResourceCard resource={resource} />
      </div>
    </div>
  );
}

// Own-profile-only editor for pin ordering — the public profile just renders
// the plain (already-ordered) list via PinnedResourcesSection's read-only
// sibling usage in ProfileView.
export function PinnedResourcesEditor() {
  const { data } = useMyPinnedResources();
  const reorderMutation = useReorderPinnedResources();
  const [items, setItems] = useState<Resource[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    reorderMutation.mutate(
      reordered.map((item) => item.id),
      { onError: () => toast.error('Could not save the new order.') },
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pinned resources yet — pin up to 6 from your submissions to feature them here.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <SortablePinnedCard key={item.id} resource={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Read-only grid — used on the public profile (Part 4: "Pinned resources
// appear at top of profile").
export function PinnedResourcesSection({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
