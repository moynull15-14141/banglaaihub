-- CreateEnum
CREATE TYPE "model_format" AS ENUM ('gguf', 'safetensors', 'onnx', 'pytorch', 'tensorflow', 'mlx', 'lora', 'adapter', 'other');

-- CreateEnum
CREATE TYPE "prompt_role" AS ENUM ('system', 'developer', 'user');

-- CreateEnum
CREATE TYPE "prompt_difficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- AlterEnum
ALTER TYPE "resource_type" ADD VALUE 'model';

-- CreateTable
CREATE TABLE "models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "architecture" VARCHAR(200),
    "base_model" VARCHAR(200),
    "format" "model_format",
    "quantization" VARCHAR(100),
    "context_length" INTEGER,
    "parameters" VARCHAR(50),
    "precision" VARCHAR(50),
    "gpu_requirement" TEXT,
    "ram_requirement" TEXT,
    "benchmark_score" JSONB,
    "inference_example" TEXT,
    "version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "changelog" TEXT,
    "demo_url" TEXT,
    "repository_url" TEXT,
    "paper_url" TEXT,
    "file_url" TEXT,
    "file_size_bytes" BIGINT,
    "checksum_sha256" VARCHAR(64),
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "role" "prompt_role" NOT NULL DEFAULT 'user',
    "content" TEXT NOT NULL,
    "target_platforms" TEXT[],
    "variables" JSONB,
    "difficulty" "prompt_difficulty",
    "example_output" TEXT,
    "version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "models_resource_id_key" ON "models"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompts_resource_id_key" ON "prompts"("resource_id");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
