-- CreateEnum
CREATE TYPE "assignment_role" AS ENUM ('writer', 'reviewer', 'seo_reviewer', 'publisher');

-- CreateEnum
CREATE TYPE "assignment_status" AS ENUM ('pending', 'in_progress', 'done');

-- CreateEnum
CREATE TYPE "editorial_comment_kind" AS ENUM ('comment', 'note');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'article_assigned';
ALTER TYPE "notification_type" ADD VALUE 'article_review_requested';
ALTER TYPE "notification_type" ADD VALUE 'article_needs_changes';
ALTER TYPE "notification_type" ADD VALUE 'article_approved';
ALTER TYPE "notification_type" ADD VALUE 'article_published';
ALTER TYPE "notification_type" ADD VALUE 'article_scheduled';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "resource_status" ADD VALUE 'idea';
ALTER TYPE "resource_status" ADD VALUE 'in_review';
ALTER TYPE "resource_status" ADD VALUE 'seo_review';
ALTER TYPE "resource_status" ADD VALUE 'needs_changes';
ALTER TYPE "resource_status" ADD VALUE 'ready_to_publish';

-- CreateTable
CREATE TABLE "article_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "role" "assignment_role" NOT NULL,
    "assigned_to_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMPTZ(6),
    "status" "assignment_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "article_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_editorial_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "kind" "editorial_comment_kind" NOT NULL DEFAULT 'comment',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "article_editorial_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_locks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "locked_by_id" UUID NOT NULL,
    "locked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "editor_id" UUID,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "excerpt" TEXT,
    "category_id" INTEGER,
    "focus_keyword" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_article_assignments_assigned_to" ON "article_assignments"("assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_assignments_resource_id_role_key" ON "article_assignments"("resource_id", "role");

-- CreateIndex
CREATE INDEX "idx_article_editorial_comments_resource" ON "article_editorial_comments"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_locks_resource_id_key" ON "article_locks"("resource_id");

-- CreateIndex
CREATE INDEX "idx_article_revisions_resource_version" ON "article_revisions"("resource_id", "version_number");

-- AddForeignKey
ALTER TABLE "article_assignments" ADD CONSTRAINT "article_assignments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_assignments" ADD CONSTRAINT "article_assignments_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_assignments" ADD CONSTRAINT "article_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_editorial_comments" ADD CONSTRAINT "article_editorial_comments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_editorial_comments" ADD CONSTRAINT "article_editorial_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_editorial_comments" ADD CONSTRAINT "article_editorial_comments_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_editorial_comments" ADD CONSTRAINT "article_editorial_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "article_editorial_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_locks" ADD CONSTRAINT "article_locks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_locks" ADD CONSTRAINT "article_locks_locked_by_id_fkey" FOREIGN KEY ("locked_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
