ALTER TABLE "Property" ADD COLUMN "isFake" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PropertyPhoto" ADD COLUMN "externalUrl" TEXT;
CREATE INDEX "Property_isFake_status_createdAt_idx" ON "Property"("isFake", "status", "createdAt");
