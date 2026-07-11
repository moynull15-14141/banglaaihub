-- CreateTable
CREATE TABLE "platform_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);
