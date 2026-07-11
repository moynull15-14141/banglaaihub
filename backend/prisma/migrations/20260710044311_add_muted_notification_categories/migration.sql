-- AlterTable
ALTER TABLE "users" ADD COLUMN     "muted_notification_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
