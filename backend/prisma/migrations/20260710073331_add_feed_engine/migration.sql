-- CreateEnum
CREATE TYPE "feed_card_type" AS ENUM ('resource_published', 'resource_updated', 'follow_activity', 'badge_earned', 'reputation_milestone', 'trending_resource', 'featured_resource', 'editors_pick', 'admin_announcement', 'comment_highlight', 'collection_shared', 'event_upcoming', 'sponsored_content');

-- CreateEnum
CREATE TYPE "feed_interaction_type" AS ENUM ('impression', 'click', 'hide', 'mute_contributor', 'mute_category', 'not_interested');

-- CreateEnum
CREATE TYPE "feed_pin_type" AS ENUM ('featured', 'editors_pick');

-- CreateTable
CREATE TABLE "feed_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_id" UUID,
    "contributor_id" UUID,
    "category_id" INTEGER,
    "target_key" TEXT NOT NULL,
    "type" "feed_interaction_type" NOT NULL,
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feed_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_pins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "pin_type" "feed_pin_type" NOT NULL,
    "position" INTEGER NOT NULL,
    "pinned_by" UUID NOT NULL,
    "note" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "created_by" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feed_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_feed_interactions_user" ON "feed_interactions"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_feed_interactions_resource" ON "feed_interactions"("resource_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "feed_interactions_user_id_type_target_key_key" ON "feed_interactions"("user_id", "type", "target_key");

-- CreateIndex
CREATE INDEX "idx_feed_pins_type_position" ON "feed_pins"("pin_type", "position");

-- CreateIndex
CREATE UNIQUE INDEX "feed_pins_resource_id_pin_type_key" ON "feed_pins"("resource_id", "pin_type");

-- CreateIndex
CREATE INDEX "idx_feed_announcements_active" ON "feed_announcements"("is_active", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_interactions" ADD CONSTRAINT "feed_interactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_pins" ADD CONSTRAINT "feed_pins_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_pins" ADD CONSTRAINT "feed_pins_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_announcements" ADD CONSTRAINT "feed_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
