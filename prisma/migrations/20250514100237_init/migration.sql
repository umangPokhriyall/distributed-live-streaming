-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STREAMER', 'WORKER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL,
    "transaction_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcoding_jobs" (
    "id" SERIAL NOT NULL,
    "stream_id" TEXT NOT NULL,
    "segment_number" INTEGER NOT NULL,
    "rendition" TEXT NOT NULL,
    "worker_id" INTEGER,
    "status" "JobStatus" NOT NULL,
    "payment_amount" DECIMAL(12,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "transcoding_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_earnings" (
    "worker_id" INTEGER NOT NULL,
    "total_earned" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(12,6) NOT NULL DEFAULT 0,

    CONSTRAINT "worker_earnings_pkey" PRIMARY KEY ("worker_id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" SERIAL NOT NULL,
    "worker_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL,
    "transaction_signature" TEXT,
    "status" "WithdrawalStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "stream_key" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "streamer_id" INTEGER NOT NULL,
    "is_live" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "total_cost" DECIMAL(12,6),

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "streams_stream_key_key" ON "streams"("stream_key");

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcoding_jobs" ADD CONSTRAINT "transcoding_jobs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_earnings" ADD CONSTRAINT "worker_earnings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
