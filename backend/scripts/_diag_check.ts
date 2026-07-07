import { env } from '../src/config/env';
import { prisma } from '../src/config/database';

async function main() {
  const url = new URL(env.DATABASE_URL);
  console.log('=== Connection target (credentials never printed) ===');
  console.log('host:', url.hostname);
  console.log('port:', url.port || '(default)');
  console.log('database:', url.pathname);

  console.log('\n=== Roles in DB ===');
  const roles = await prisma.role.findMany({ select: { name: true } });
  console.log(roles.map((r) => r.name));

  console.log('\n=== Permissions count ===');
  console.log(await prisma.permission.count());

  console.log('\n=== Total users ===');
  console.log(await prisma.user.count());

  console.log('\n=== 5 most recent users (email domain only, no PII) ===');
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, email: true, createdAt: true, status: true },
  });
  for (const u of recentUsers) {
    const emailDomain = u.email.split('@')[1] ?? 'unknown';
    const userRoles = await prisma.userRole.findMany({
      where: { userId: u.id },
      include: { role: true },
    });
    console.log({
      username: u.username,
      emailDomain,
      status: u.status,
      createdAt: u.createdAt,
      roles: userRoles.map((ur) => ur.role.name),
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('DIAG_ERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
