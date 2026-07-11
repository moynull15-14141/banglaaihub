// Mirrors the 8-tier hierarchy in project-planning/13-security-specification.md.
// Each role is cumulative — a fixed, rarely-changing set, so it's a plain
// constant here rather than fetched from an API (there is no /admin/roles
// endpoint; roles are seeded once via backend/scripts/seed.ts).
export const ROLE_OPTIONS = [
  'guest',
  'user',
  'contributor',
  'verified_contributor',
  'moderator',
  'editor',
  'admin',
  'super_admin',
  // Phase 5A-3 (Editorial Workflow) — parallel specializations, NOT more
  // rungs in the cumulative ladder above (see backend/scripts/seed.ts's
  // SPECIALIZATION_ROLES) — assignable alongside any ladder role via the
  // same many-to-many UserRole table.
  'writer',
  'seo_editor',
  'publisher',
] as const;

export type RoleName = (typeof ROLE_OPTIONS)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  guest: 'Guest',
  user: 'User',
  contributor: 'Contributor',
  verified_contributor: 'Verified Contributor',
  moderator: 'Moderator',
  editor: 'Editor',
  admin: 'Admin',
  super_admin: 'Super Admin',
  writer: 'Writer',
  seo_editor: 'SEO Editor',
  publisher: 'Publisher',
};

// Only super_admin can grant these two tiers, or change the roles of a user
// who already has one — mirrors the guard in
// backend/src/services/users.service.ts's updateUserRoles.
// Typed as plain strings (not RoleName[]) since it's compared against
// User.roles: string[] (API-sourced role names), not just RoleName literals.
export const TOP_TIER_ROLES: readonly string[] = ['admin', 'super_admin'];

// Every role tier that already carries resource:create (see
// backend/scripts/seed.ts's cumulative permission table — `contributor` is
// the first tier to grant it, and every tier above inherits it). Used to
// gate /submit and to decide whether the nav/dashboard should show
// "Become a Contributor" or treat the account as already having access.
export const CONTRIBUTOR_TIER_ROLES: readonly string[] = [
  'contributor',
  'verified_contributor',
  'moderator',
  'editor',
  'admin',
  'super_admin',
];

export function hasContributorAccess(roles: string[]): boolean {
  return roles.some((role) => CONTRIBUTOR_TIER_ROLES.includes(role));
}
