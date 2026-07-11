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
import type { Badge } from '@/types/badge';

interface BadgeFormDialogProps {
  badge: Badge | null; // null = create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (input: { key?: string; name: string; description: string; icon: string }) => void;
}

const ICON_OPTIONS = ['BadgeCheck', 'Rocket', 'Layers', 'Star', 'MessageCircle', 'TrendingUp', 'Crown', 'Award'];

export function BadgeFormDialog({ badge, open, onOpenChange, isPending, onSubmit }: BadgeFormDialogProps) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);

  useEffect(() => {
    if (open) {
      setKey(badge?.key ?? '');
      setName(badge?.name ?? '');
      setDescription(badge?.description ?? '');
      setIcon(badge?.icon ?? ICON_OPTIONS[0]);
    }
  }, [open, badge]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{badge ? `Edit "${badge.name}"` : 'Create badge'}</DialogTitle>
          <DialogDescription>Badges can be auto-awarded by milestone checks or granted manually.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!badge ? (
            <div className="space-y-1.5">
              <Label htmlFor="badge-key">Key</Label>
              <Input
                id="badge-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="early_adopter"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="badge-name">Name</Label>
            <Input id="badge-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-description">Description</Label>
            <Textarea
              id="badge-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="badge-icon">Icon</Label>
            <select
              id="badge-icon"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            disabled={!name.trim() || !description.trim() || (!badge && !key.trim())}
            onClick={() =>
              onSubmit({
                key: badge ? undefined : key.trim(),
                name: name.trim(),
                description: description.trim(),
                icon,
              })
            }
          >
            {badge ? 'Save changes' : 'Create badge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
