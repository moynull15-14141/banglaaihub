-- CreateEnum
CREATE TYPE "stat_card_slot" AS ENUM ('dataset', 'paper', 'tool', 'model', 'article', 'tutorial', 'prompt', 'project', 'news');

-- CreateTable
CREATE TABLE "stat_card_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot" "stat_card_slot" NOT NULL,
    "image_key" TEXT NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stat_card_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stat_card_images_slot_key" ON "stat_card_images"("slot");

-- AddForeignKey
ALTER TABLE "stat_card_images" ADD CONSTRAINT "stat_card_images_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
