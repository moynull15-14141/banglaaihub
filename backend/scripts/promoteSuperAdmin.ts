import { prisma } from '../src/config/database';
import { logger } from '../src/config/logger';
import { writeAuditLog } from '../src/utils/auditLog';

// One-time bootstrap: grants the project owner's existing account the
// super_admin role so they can access the Admin Panel. Does not touch RBAC
// logic, middleware, or permissions — only inserts a row into the existing
// user_roles junction table, the same table AuthService/UserService already
// read from. Safe to re-run (idempotent): a second run finds the role
// already assigned and does nothing.
const TARGET_EMAIL = 'moynulhasan4044@gmail.com';
const TARGET_ROLE_NAME = 'super_admin';

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    throw new Error(
      `No user found with email ${TARGET_EMAIL}. They must sign up / log in at least once before this script can run.`,
    );
  }

  const role = await prisma.role.findUnique({ where: { name: TARGET_ROLE_NAME } });
  if (!role) {
    throw new Error(`Role "${TARGET_ROLE_NAME}" is not seeded. Run "npm run db:seed" first.`);
  }

  const existingAssignment = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
  });

  if (existingAssignment) {
    logger.info(`${TARGET_EMAIL} already has the ${TARGET_ROLE_NAME} role. Nothing to do.`);
    return;
  }

  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id },
  });

  await writeAuditLog({
    actorId: null,
    action: 'bootstrap.super_admin_grant',
    targetType: 'user',
    targetId: user.id,
    newValue: { role: TARGET_ROLE_NAME },
  });

  logger.info(`Assigned the ${TARGET_ROLE_NAME} role to ${TARGET_EMAIL}.`);
}

main()
  .catch((error: unknown) => {
    logger.error('Super admin promotion failed', { error });
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
