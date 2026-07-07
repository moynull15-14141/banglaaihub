-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "documentation_url" TEXT;

-- AlterTable
ALTER TABLE "tools" ADD COLUMN     "checksum_sha256" VARCHAR(64),
ADD COLUMN     "file_size_bytes" BIGINT,
ADD COLUMN     "file_url" TEXT;
