-- CreateEnum
CREATE TYPE "font_slot" AS ENUM ('sans', 'heading', 'mono');

-- CreateEnum
CREATE TYPE "font_source" AS ENUM ('google', 'custom');

-- CreateEnum
CREATE TYPE "font_style" AS ENUM ('normal', 'italic');

-- CreateTable
CREATE TABLE "site_fonts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot" "font_slot" NOT NULL,
    "source" "font_source" NOT NULL,
    "family" TEXT NOT NULL,
    "fallback" TEXT NOT NULL DEFAULT 'ui-sans-serif, system-ui, sans-serif',
    "updated_by_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_fonts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_font_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "font_id" UUID NOT NULL,
    "weight" INTEGER NOT NULL,
    "style" "font_style" NOT NULL DEFAULT 'normal',
    "file_key" TEXT NOT NULL,
    "format" TEXT NOT NULL,

    CONSTRAINT "site_font_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_fonts_slot_key" ON "site_fonts"("slot");

-- CreateIndex
CREATE UNIQUE INDEX "site_font_files_font_id_weight_style_key" ON "site_font_files"("font_id", "weight", "style");

-- AddForeignKey
ALTER TABLE "site_fonts" ADD CONSTRAINT "site_fonts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_font_files" ADD CONSTRAINT "site_font_files_font_id_fkey" FOREIGN KEY ("font_id") REFERENCES "site_fonts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
