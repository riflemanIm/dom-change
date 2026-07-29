/*
  Warnings:

  - Added the required column `mimeType` to the `PropertyPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `PropertyPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PropertyPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FileProcessingStatus" AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "PropertyPhoto" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStatus" "FileProcessingStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE INDEX "PropertyPhoto_processingStatus_createdAt_idx" ON "PropertyPhoto"("processingStatus", "createdAt");
