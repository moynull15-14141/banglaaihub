-- CreateEnum
CREATE TYPE "profile_visibility" AS ENUM ('public', 'private', 'followers_only');

-- CreateEnum
CREATE TYPE "user_analytics_event" AS ENUM ('profile_view', 'profile_share', 'follow', 'unfollow', 'pinned_resource_click', 'social_link_click');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'follow_received';
ALTER TYPE "notification_type" ADD VALUE 'badge_received';
ALTER TYPE "notification_type" ADD VALUE 'level_up';
ALTER TYPE "notification_type" ADD VALUE 'milestone_reached';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "following_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gitlab_url" TEXT,
ADD COLUMN     "headline" VARCHAR(200),
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "profile_visibility" "profile_visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "research_interests" TEXT[],
ADD COLUMN     "skills" TEXT[];

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pinned_resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "awarded_by" UUID,
    "awarded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_analytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_user_id" UUID NOT NULL,
    "event_type" "user_analytics_event" NOT NULL,
    "viewer_id" UUID,
    "ip_address" INET,
    "referrer" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "pinned_resources_user_id_position_idx" ON "pinned_resources"("user_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "pinned_resources_user_id_resource_id_key" ON "pinned_resources"("user_id", "resource_id");

-- CreateIndex
CREATE INDEX "activities_user_id_created_at_idx" ON "activities"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_resources" ADD CONSTRAINT "pinned_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_resources" ADD CONSTRAINT "pinned_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
