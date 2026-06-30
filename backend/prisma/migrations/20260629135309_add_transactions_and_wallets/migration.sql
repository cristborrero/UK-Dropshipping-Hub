-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('SELLER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'REFUNDED', 'FAILED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "stripe_charge_id" TEXT,
    "seller_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "gross_amount" DOUBLE PRECISION NOT NULL,
    "platform_fee_amount" DOUBLE PRECISION NOT NULL,
    "seller_net_amount" DOUBLE PRECISION NOT NULL,
    "supplier_net_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "owner_type" "WalletOwnerType" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripe_payment_intent_id_key" ON "transactions"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_owner_id_key" ON "wallets"("owner_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_seller_fk" FOREIGN KEY ("owner_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_supplier_fk" FOREIGN KEY ("owner_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
