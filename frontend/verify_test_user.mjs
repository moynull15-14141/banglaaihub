import { prisma } from './src/config/database.ts';
const email = 'post-ui-test@example.com';
const user = await prisma.user.findUnique({ where: { email } });
if (user) {
  await prisma.report.deleteMany({ where: { reporterId: user.id } });
  await prisma.postLike.deleteMany({ where: { userId: user.id } });
  await prisma.post.deleteMany({ where: { authorId: user.id } });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('deleted');
} else {
  console.log('already gone');
}
await prisma.$disconnect();
