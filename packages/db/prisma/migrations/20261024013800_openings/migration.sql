-- CreateEnum
CREATE TYPE "BoardOrigin" AS ENUM ('SEED', 'JOB_URL', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "PostingLevel" AS ENUM ('INTERN', 'ENTRY', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "PostingActionStatus" AS ENUM ('DISMISSED', 'ADDED');

-- CreateTable
CREATE TABLE "job_board" (
    "id" TEXT NOT NULL,
    "ats" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "origin" "BoardOrigin" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastScanAt" TIMESTAMP(3),
    "lastError" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posting" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "level" "PostingLevel" NOT NULL,
    "postedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "extra" JSONB,

    CONSTRAINT "job_posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_action" (
    "userId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "status" "PostingActionStatus" NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posting_action_pkey" PRIMARY KEY ("userId","postingId")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_board_ats_slug_key" ON "job_board"("ats", "slug");

-- CreateIndex
CREATE INDEX "job_posting_closedAt_firstSeenAt_idx" ON "job_posting"("closedAt", "firstSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "job_posting_boardId_externalId_key" ON "job_posting"("boardId", "externalId");

-- AddForeignKey
ALTER TABLE "job_posting" ADD CONSTRAINT "job_posting_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "job_board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_action" ADD CONSTRAINT "posting_action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_action" ADD CONSTRAINT "posting_action_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "job_posting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

