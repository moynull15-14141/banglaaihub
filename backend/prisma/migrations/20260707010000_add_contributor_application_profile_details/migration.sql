-- AlterTable
-- Added nullable first, then backfilled, because this table can already have
-- rows (it did in production/dev) — a bare ADD COLUMN ... NOT NULL fails on
-- any existing row. New rows always provide real values (enforced by
-- submitContributorApplicationSchema); "Not specified" only ever lands on
-- rows that predate these columns.
ALTER TABLE "contributor_applications" ADD COLUMN     "profession" TEXT,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "country" TEXT;

UPDATE "contributor_applications" SET "profession" = 'Not specified' WHERE "profession" IS NULL;
UPDATE "contributor_applications" SET "organization" = 'Not specified' WHERE "organization" IS NULL;
UPDATE "contributor_applications" SET "country" = 'Not specified' WHERE "country" IS NULL;

ALTER TABLE "contributor_applications" ALTER COLUMN "profession" SET NOT NULL;
ALTER TABLE "contributor_applications" ALTER COLUMN "organization" SET NOT NULL;
ALTER TABLE "contributor_applications" ALTER COLUMN "country" SET NOT NULL;
