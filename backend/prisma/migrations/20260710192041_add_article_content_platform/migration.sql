-- CreateEnum
CREATE TYPE "article_content_type" AS ENUM ('article', 'tutorial', 'guide', 'news', 'announcement', 'editorial', 'interview', 'release_notes', 'opinion', 'case_study', 'community_update');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "resource_status" ADD VALUE 'draft';
ALTER TYPE "resource_status" ADD VALUE 'scheduled';
ALTER TYPE "resource_status" ADD VALUE 'archived';

-- AlterEnum
ALTER TYPE "resource_type" ADD VALUE 'article';

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "content_type" "article_content_type" NOT NULL DEFAULT 'article',
    "featured_image_url" TEXT,
    "social_image_url" TEXT,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(200),
    "canonical_url" TEXT,
    "reading_time_minutes" INTEGER,
    "scheduled_at" TIMESTAMPTZ(6),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "editors_pick" BOOLEAN NOT NULL DEFAULT false,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "allow_reactions" BOOLEAN NOT NULL DEFAULT true,
    "allow_sharing" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_resource_id_key" ON "articles"("resource_id");

-- CreateIndex
CREATE INDEX "idx_articles_scheduled" ON "articles"("scheduled_at");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
