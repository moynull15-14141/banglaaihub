-- CreateTable
CREATE TABLE "resource_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_resource_files_resource" ON "resource_files"("resource_id");

-- AddForeignKey
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
