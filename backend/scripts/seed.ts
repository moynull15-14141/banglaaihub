import { prisma } from '../src/config/database';
import { logger } from '../src/config/logger';

// Role hierarchy and permission matrix transcribed from doc 13 (Security Specification).
// Each role's set is cumulative — it includes every permission of the roles below it.
const ROLES = [
  'guest',
  'user',
  'contributor',
  'verified_contributor',
  'moderator',
  'editor',
  'admin',
  'super_admin',
] as const;

const PERMISSIONS: Record<string, string> = {
  'resource:view': 'View resources',
  'profile:view': 'View user profiles',
  'resource:edit_own': 'Edit own resource',
  'resource:delete_own': 'Delete own resource',
  'resource:bookmark': 'Bookmark resources',
  'comment:create': 'Post comments',
  'comment:edit_own': 'Edit own comment',
  'comment:delete_own': 'Delete own comment',
  'review:create': 'Write a review',
  'review:edit_own': 'Edit own review',
  'review:delete_own': 'Delete own review',
  'review:helpful': 'Mark a review as helpful',
  'like:create': 'Like a resource or comment',
  'user:follow': 'Follow other users',
  'resource:report': 'Report resources',
  'contributor_application:submit': 'Apply to become a contributor',
  'contributor_application:view_own': 'View own contributor application',
  'contributor_application:withdraw': 'Withdraw own contributor application',
  'resource:create': 'Submit a resource',
  'resource:upload': 'Upload dataset files',
  'resource:edit_any': 'Edit any resource',
  'resource:delete_any': 'Delete or hard-delete any resource',
  'comment:delete_any': 'Delete any comment',
  'review:delete_any': 'Delete any review',
  'resource:approve': 'Approve or reject resource submissions',
  'resource:feature': 'Feature or unfeature a resource',
  'report:resolve': 'Resolve user reports',
  'report:reject': 'Reject user reports',
  'contributor_application:review': 'Review contributor applications',
  'user:manage': 'Manage user accounts',
  'user:ban': 'Ban user accounts',
  'user:role_change': 'Change a user’s role',
  'user:verify': 'Verify or unverify a user',
  'user:manage_badges': 'Grant or revoke badges, manage the badge catalog',
  'profile:moderate': 'Reset cover images and remove abusive follows',
  'system:audit_log_view': 'View audit logs',
  'admin:manage': 'Manage admin accounts',
  'system:configure': 'Change system configuration',
  // Phase 5A-1 — Content Platform. Distinct from `resource:*` — authoring
  // CMS articles is an editorial-staff capability, not something every
  // contributor unlocks (see resource.validator.ts's `article` type).
  'content:create': 'Create an article',
  'content:edit': 'Edit any article',
  'content:publish': 'Publish, schedule, or archive an article',
  'content:delete': 'Delete any article',
  // Phase 5A-3 — Editorial Workflow. `content:review`/`content:seo_review`
  // gate the review-stage transitions (in_review -> needs_changes/seo_review,
  // seo_review -> needs_changes/ready_to_publish) distinctly from
  // content:edit/content:publish, which already existed.
  'content:review': 'Review submitted articles (approve to SEO review or request changes)',
  'content:seo_review': 'Perform SEO review on articles (approve to publish-ready or request changes)',
  // Paid Resource Downloads (Phase A) — real-money approval, kept at the
  // same admin tier as resource:delete_any/content:delete above, not
  // editor, since it moves wallet balances.
  'payout:manage': 'Approve, reject, or mark payout requests as paid',
};

// Cumulative permission set per role, per doc 13's permissions matrix.
const ROLE_PERMISSIONS: Record<(typeof ROLES)[number], string[]> = {
  guest: ['resource:view', 'profile:view'],
  user: [
    'resource:view',
    'profile:view',
    'resource:edit_own',
    'resource:delete_own',
    'resource:bookmark',
    'comment:create',
    'comment:edit_own',
    'comment:delete_own',
    'review:create',
    'review:edit_own',
    'review:delete_own',
    'review:helpful',
    'like:create',
    'user:follow',
    'resource:report',
    'contributor_application:submit',
    'contributor_application:view_own',
    'contributor_application:withdraw',
  ],
  // `resource:create` lives here, not on `user` — becoming a contributor
  // (via an approved contributor application, see ContributorApplicationService)
  // is what unlocks publishing. `user` can browse/bookmark/comment/report and
  // apply, but not submit resources.
  contributor: ['resource:create', 'resource:upload'],
  verified_contributor: [],
  moderator: ['resource:edit_any', 'comment:delete_any', 'review:delete_any'],
  editor: [
    'resource:approve',
    'resource:feature',
    'report:resolve',
    'report:reject',
    'contributor_application:review',
    'content:create',
    'content:edit',
    'content:publish',
    'content:review',
    'content:seo_review',
  ],
  // resource:delete_any (including hard-delete of pending/rejected resources)
  // sits at admin, one tier above resource:edit_any (moderator) — deleting is
  // more destructive/harder to reverse than editing, so it gets the stricter gate.
  admin: [
    'user:manage',
    'user:ban',
    'user:role_change',
    'user:verify',
    'user:manage_badges',
    'profile:moderate',
    'system:audit_log_view',
    'resource:delete_any',
    'content:delete',
    'payout:manage',
  ],
  super_admin: ['admin:manage', 'system:configure'],
};

// Phase 5A-3 — Editorial Workflow specialization roles. Deliberately NOT
// appended to the ROLES ladder above: Writer/SEO Editor/Publisher are
// parallel specializations (a Publisher doesn't need SEO-review permission),
// not more rungs in the guest->...->super_admin cumulative hierarchy.
// Assigned via the same many-to-many UserRole table as every other role —
// AuthService.getUserPermissions() unions permissions across ALL of a
// user's roles, so someone can hold e.g. `contributor` + `writer` at once.
// Non-cumulative: each role's list is its own complete grant, not resolved
// against any ladder position.
const SPECIALIZATION_ROLES = ['writer', 'seo_editor', 'publisher'] as const;

const SPECIALIZATION_ROLE_PERMISSIONS: Record<(typeof SPECIALIZATION_ROLES)[number], string[]> = {
  writer: ['content:create'],
  seo_editor: ['content:seo_review', 'content:edit'],
  publisher: ['content:publish', 'content:edit'],
};

async function seedSpecializationRoles(permissionIds: Map<string, number>): Promise<number> {
  for (const name of SPECIALIZATION_ROLES) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });

    const desiredPermissionIds = SPECIALIZATION_ROLE_PERMISSIONS[name]
      .map((permissionName) => permissionIds.get(permissionName))
      .filter((permissionId): permissionId is number => permissionId !== undefined);

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: desiredPermissionIds } },
    });

    if (desiredPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  return SPECIALIZATION_ROLES.length;
}

function resolveCumulativePermissions(role: (typeof ROLES)[number]): string[] {
  const index = ROLES.indexOf(role);
  const permissions = new Set<string>();

  for (let i = 0; i <= index; i += 1) {
    for (const permission of ROLE_PERMISSIONS[ROLES[i]]) {
      permissions.add(permission);
    }
  }

  return Array.from(permissions);
}

async function seedPermissions(): Promise<Map<string, number>> {
  const nameToId = new Map<string, number>();

  for (const [name, description] of Object.entries(PERMISSIONS)) {
    const permission = await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    nameToId.set(name, permission.id);
  }

  return nameToId;
}

async function seedRoles(): Promise<Map<string, number>> {
  const nameToId = new Map<string, number>();

  for (const name of ROLES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    nameToId.set(name, role.id);
  }

  return nameToId;
}

// Fully declarative: brings role_permissions in line with ROLE_PERMISSIONS
// exactly — adds missing grants AND removes stale ones (e.g. `user` losing
// `resource:create` when that permission moved to `contributor`). A purely
// additive seed (createMany + skipDuplicates only) would leave old grants
// behind forever once a permission is removed from a role's list here.
async function seedRolePermissions(
  roleIds: Map<string, number>,
  permissionIds: Map<string, number>,
): Promise<void> {
  for (const role of ROLES) {
    const roleId = roleIds.get(role);
    if (roleId === undefined) continue;

    const permissionNames = resolveCumulativePermissions(role);
    const desiredPermissionIds = permissionNames
      .map((name) => permissionIds.get(name))
      .filter((permissionId): permissionId is number => permissionId !== undefined);

    await prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: { notIn: desiredPermissionIds } },
    });

    if (desiredPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
  }
}

// Phase 4B — auto-awarded badge catalog. Checked by BadgeService.checkAndAwardMilestones
// after reputation/review/comment/resource-approval events; `awardedBy: null`
// on the resulting UserBadge row distinguishes these from admin manual grants.
const BADGE_CATALOG: { key: string; name: string; description: string; icon: string }[] = [
  {
    key: 'verified_contributor',
    name: 'Verified Contributor',
    description: 'Identity verified by the BanglaAIHub team.',
    icon: 'BadgeCheck',
  },
  {
    key: 'first_upload',
    name: 'First Upload',
    description: 'Had their first resource approved.',
    icon: 'Rocket',
  },
  {
    key: 'prolific_contributor',
    name: 'Prolific Contributor',
    description: 'Reached 10 approved resources.',
    icon: 'Layers',
  },
  {
    key: 'top_reviewer',
    name: 'Top Reviewer',
    description: 'Wrote 10 helpful reviews.',
    icon: 'Star',
  },
  {
    key: 'community_voice',
    name: 'Community Voice',
    description: 'Posted 25 comments.',
    icon: 'MessageCircle',
  },
  {
    key: 'rising_star',
    name: 'Rising Star',
    description: 'Reached the Trusted reputation tier.',
    icon: 'TrendingUp',
  },
  {
    key: 'legend',
    name: 'Legend',
    description: 'Reached the Legend reputation tier.',
    icon: 'Crown',
  },
];

async function seedBadges(): Promise<void> {
  for (const badge of BADGE_CATALOG) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: { name: badge.name, description: badge.description, icon: badge.icon },
      create: badge,
    });
  }
}

async function main(): Promise<void> {
  logger.info('Seeding roles and permissions...');

  const permissionIds = await seedPermissions();
  const roleIds = await seedRoles();
  await seedRolePermissions(roleIds, permissionIds);
  const specializationRoleCount = await seedSpecializationRoles(permissionIds);
  await seedBadges();

  logger.info(
    `Seeded ${roleIds.size + specializationRoleCount} roles, ${permissionIds.size} permissions, and ${BADGE_CATALOG.length} badges.`,
  );
}

main()
  .catch((error: unknown) => {
    logger.error('Seed failed', { error });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
