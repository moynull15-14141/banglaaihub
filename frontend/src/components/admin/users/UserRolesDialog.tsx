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
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_OPTIONS, TOP_TIER_ROLES } from '@/lib/constants/roles';
import { useAuth } from '@/lib/hooks/useAuth';
import type { AdminUser } from '@/types/admin';

interface UserRolesDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (roleNames: string[]) => void;
}

// This replaces the user's ENTIRE role set (matches the backend's
// PATCH /admin/users/:id/roles semantics — a full replace, not additive),
// so the dialog always shows every role as a toggle, pre-checked from the
// user's current assignment.
//
// Mirrors the privilege-escalation guard in
// backend/src/services/users.service.ts's updateUserRoles: only a
// super_admin can grant admin/super_admin, or touch the roles of a user who
// already has either. This is UI-only convenience (avoids a surprise 403
// after clicking Save) — the backend re-checks regardless.
export function UserRolesDialog({ user, onOpenChange, isPending, onConfirm }: UserRolesDialogProps) {
  const { user: actor } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setSelected(new Set(user.roles));
    }
  }, [user]);

  const actorIsSuperAdmin = Boolean(actor?.roles.includes('super_admin'));
  const targetHasTopTierRole = Boolean(
    user && user.roles.some((role) => TOP_TIER_ROLES.includes(role)),
  );
  const canEdit = actorIsSuperAdmin || !targetHasTopTierRole;

  function toggleRole(role: string) {
    if (TOP_TIER_ROLES.includes(role) && !actorIsSuperAdmin) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {user ? (
          <>
            <DialogHeader>
              <DialogTitle>Roles for {user.display_name ?? user.username}</DialogTitle>
              <DialogDescription>
                {canEdit
                  ? 'Roles are cumulative — each tier includes everything below it. This replaces their entire role set.'
                  : 'Only a super_admin can change the roles of a user who already has the admin or super_admin role.'}
              </DialogDescription>
            </DialogHeader>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = selected.has(role);
                  const isLocked = TOP_TIER_ROLES.includes(role) && !actorIsSuperAdmin;
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={isLocked}
                      onClick={() => toggleRole(role)}
                      aria-pressed={isSelected}
                      title={isLocked ? 'Only a super_admin can grant this role.' : undefined}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        isLocked
                          ? 'cursor-not-allowed border-border text-muted-foreground/50'
                          : isSelected
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {canEdit ? 'Cancel' : 'Close'}
              </Button>
              {canEdit ? (
                <Button
                  loading={isPending}
                  disabled={selected.size === 0}
                  onClick={() => onConfirm(Array.from(selected))}
                >
                  Save roles
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
