'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useMyContributorApplication } from '@/lib/hooks/useContributorApplication';
import { hasContributorAccess } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';

const ACTIVE_STATUSES = new Set(['pending', 'needs_revision']);

export interface ContributorNavStatus {
  label: string;
  href: string;
}

// Drives the dynamic contributor-status entry in Navbar/DashboardTopbar/
// DashboardSidebarNav. Returns null once the account already has
// contributor+ access — the regular Dashboard link covers that case, there's
// no separate "Contributor Dashboard" route.
export function useContributorNavStatus(): ContributorNavStatus | null {
  const { user, isAuthenticated } = useAuth();
  const alreadyContributor = hasContributorAccess(user?.roles ?? []);
  const { data: application } = useMyContributorApplication(isAuthenticated && !alreadyContributor);

  if (!isAuthenticated || !user || alreadyContributor) {
    return null;
  }

  if (application && ACTIVE_STATUSES.has(application.status)) {
    return { label: 'Application Status', href: ROUTES.contributorApplication };
  }

  return { label: 'Become a Contributor', href: ROUTES.contributorApplication };
}
