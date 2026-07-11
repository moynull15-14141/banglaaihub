-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "analytics_event_type" ADD VALUE 'rating';
ALTER TYPE "analytics_event_type" ADD VALUE 'review';
ALTER TYPE "analytics_event_type" ADD VALUE 'comment';
ALTER TYPE "analytics_event_type" ADD VALUE 'reply';
ALTER TYPE "analytics_event_type" ADD VALUE 'like';
ALTER TYPE "analytics_event_type" ADD VALUE 'helpful';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'review_received';
ALTER TYPE "notification_type" ADD VALUE 'resource_liked';
ALTER TYPE "notification_type" ADD VALUE 'review_helpful';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "comment_id" UUID,
ADD COLUMN     "review_id" UUID;

-- CheckConstraint
-- Enforces that a report targets exactly one of resource/comment/review.
ALTER TABLE "reports" ADD CONSTRAINT "reports_exactly_one_target_check"
  CHECK (num_nonnulls("resource_id", "comment_id", "review_id") = 1);

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "avg_rating" DOUBLE PRECISION,
ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" VARCHAR(200),
    "body" TEXT,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" "comment_status" NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reviews_resource_status" ON "reviews"("resource_id", "status");

-- CreateIndex
CREATE INDEX "idx_reviews_author" ON "reviews"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_resource_id_author_id_key" ON "reviews"("resource_id", "author_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_likes_user_id_resource_id_key" ON "resource_likes"("user_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_user_id_comment_id_key" ON "comment_likes"("user_id", "comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_votes_user_id_review_id_key" ON "review_helpful_votes"("user_id", "review_id");

-- CreateIndex
CREATE INDEX "idx_resources_avg_rating" ON "resources"("avg_rating");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_likes" ADD CONSTRAINT "resource_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_likes" ADD CONSTRAINT "resource_likes_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
