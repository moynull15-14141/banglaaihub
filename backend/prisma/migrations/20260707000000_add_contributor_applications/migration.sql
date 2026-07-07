-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'contributor_application_approved';
ALTER TYPE "notification_type" ADD VALUE 'contributor_application_rejected';
ALTER TYPE "notification_type" ADD VALUE 'contributor_application_needs_revision';

-- CreateEnum
CREATE TYPE "contributor_application_status" AS ENUM ('pending', 'approved', 'rejected', 'needs_revision', 'withdrawn');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kaggle_url" TEXT,
ADD COLUMN     "huggingface_url" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "orcid_id" VARCHAR(19),
ADD COLUMN     "x_url" TEXT,
ADD COLUMN     "external_stats" JSONB;

-- CreateTable
CREATE TABLE "contributor_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" "contributor_application_status" NOT NULL DEFAULT 'pending',
    "full_name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "sample_works" TEXT,
    "sample_file_urls" TEXT[],
    "supporting_document_urls" TEXT[],
    "profile_snapshot" JSONB NOT NULL,
    "reviewer_id" UUID,
    "review_notes" TEXT,
    "feedback_to_applicant" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contributor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_contributor_applications_user" ON "contributor_applications"("user_id");

-- CreateIndex
CREATE INDEX "idx_contributor_applications_status" ON "contributor_applications"("status");

-- AddForeignKey
ALTER TABLE "contributor_applications" ADD CONSTRAINT "contributor_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributor_applications" ADD CONSTRAINT "contributor_applications_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
