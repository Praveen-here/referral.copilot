-- AlterTable
ALTER TABLE "job_opportunity" ADD COLUMN     "mergedIntoId" TEXT;

-- CreateIndex
CREATE INDEX "job_opportunity_mergedIntoId_idx" ON "job_opportunity"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "job_opportunity" ADD CONSTRAINT "job_opportunity_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "job_opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

