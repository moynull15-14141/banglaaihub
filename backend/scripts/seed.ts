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
  'resource:create': 'Submit a resource',
  'resource:edit_own': 'Edit own resource',
  'resource:delete_own': 'Delete own resource',
  'resource:bookmark': 'Bookmark resources',
  'comment:create': 'Post comments',
  'resource:report': 'Report resources',
  'resource:upload': 'Upload dataset files',
  'resource:edit_any': 'Edit any resource',
  'comment:delete_any': 'Delete any comment',
  'resource:approve': 'Approve or reject resource submissions',
  'resource:feature': 'Feature or unfeature a resource',
  'report:resolve': 'Resolve user reports',
  'report:reject': 'Reject user reports',
  'user:manage': 'Manage user accounts',
  'user:ban': 'Ban user accounts',
  'user:role_change': 'Change a user’s role',
  'system:audit_log_view': 'View audit logs',
  'admin:manage': 'Manage admin accounts',
  'system:configure': 'Change system configuration',
};

// Cumulative permission set per role, per doc 13's permissions matrix.
const ROLE_PERMISSIONS: Record<(typeof ROLES)[number], string[]> = {
  guest: ['resource:view', 'profile:view'],
  user: [
    'resource:view',
    'profile:view',
    'resource:create',
    'resource:edit_own',
    'resource:delete_own',
    'resource:bookmark',
    'comment:create',
    'resource:report',
  ],
  contributor: ['resource:upload'],
  verified_contributor: [],
  moderator: ['resource:edit_any', 'comment:delete_any'],
  editor: ['resource:approve', 'resource:feature', 'report:resolve', 'report:reject'],
  admin: ['user:manage', 'user:ban', 'user:role_change', 'system:audit_log_view'],
  super_admin: ['admin:manage', 'system:configure'],
};

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

async function seedRolePermissions(
  roleIds: Map<string, number>,
  permissionIds: Map<string, number>,
): Promise<void> {
  for (const role of ROLES) {
    const roleId = roleIds.get(role);
    if (roleId === undefined) continue;

    const permissionNames = resolveCumulativePermissions(role);
    const data = permissionNames
      .map((name) => permissionIds.get(name))
      .filter((permissionId): permissionId is number => permissionId !== undefined)
      .map((permissionId) => ({ roleId, permissionId }));

    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
  }
}

async function main(): Promise<void> {
  logger.info('Seeding roles and permissions...');

  const permissionIds = await seedPermissions();
  const roleIds = await seedRoles();
  await seedRolePermissions(roleIds, permissionIds);

  logger.info(`Seeded ${roleIds.size} roles and ${permissionIds.size} permissions.`);
}

main()
  .catch((error: unknown) => {
    logger.error('Seed failed', { error });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
