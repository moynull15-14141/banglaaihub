-- CreateEnum
CREATE TYPE "currency" AS ENUM ('BDT', 'USD');

-- CreateEnum
CREATE TYPE "purchase_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "payout_method" AS ENUM ('bkash', 'nagad', 'rocket', 'bank_transfer');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('pending', 'approved', 'rejected', 'paid');

-- CreateEnum
CREATE TYPE "wallet_entry_type" AS ENUM ('sale_earning', 'withdrawal', 'adjustment');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'payment_received';
ALTER TYPE "notification_type" ADD VALUE 'purchase_completed';
ALTER TYPE "notification_type" ADD VALUE 'payout_approved';
ALTER TYPE "notification_type" ADD VALUE 'payout_rejected';
ALTER TYPE "notification_type" ADD VALUE 'payout_paid';

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "currency" "currency",
ADD COLUMN     "price_cents" INTEGER;

-- CreateTable
CREATE TABLE "resource_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" "currency" NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "author_earnings_cents" INTEGER NOT NULL,
    "status" "purchase_status" NOT NULL DEFAULT 'pending',
    "gateway_name" TEXT NOT NULL DEFAULT 'sslcommerz',
    "gateway_transaction_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "type" "wallet_entry_type" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "balance_after_cents" INTEGER NOT NULL,
    "related_purchase_id" UUID,
    "related_payout_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_balances" (
    "user_id" UUID NOT NULL,
    "currency" "currency" NOT NULL,
    "balance_cents" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallet_balances_pkey" PRIMARY KEY ("user_id","currency")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" "currency" NOT NULL,
    "method" "payout_method" NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "payout_status" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "paid_reference" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_purchases_gateway_transaction_id_key" ON "resource_purchases"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "idx_resource_purchases_buyer" ON "resource_purchases"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_purchases_resource_id_buyer_id_status_key" ON "resource_purchases"("resource_id", "buyer_id", "status");

-- CreateIndex
CREATE INDEX "idx_wallet_ledger_user_currency" ON "wallet_ledger_entries"("user_id", "currency");

-- CreateIndex
CREATE INDEX "idx_payout_requests_user" ON "payout_requests"("user_id");

-- AddForeignKey
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_purchases" ADD CONSTRAINT "resource_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_balances" ADD CONSTRAINT "wallet_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
