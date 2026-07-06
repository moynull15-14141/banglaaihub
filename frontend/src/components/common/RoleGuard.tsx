'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { EmptyState } from '@/components/common/EmptyState';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Client-side gate only — a UX convenience, not a security boundary. The
// backend's authorize() middleware and permission matrix (doc 13) are the
// actual enforcement point; this only hides UI the user can't act on anyway.
export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.some((role) => user.roles.includes(role))) {
    return (
      fallback ?? (
        <EmptyState
          title="Access restricted"
          description="You don't have permission to view this page."
        />
      )
    );
  }

  return <>{children}</>;
}
