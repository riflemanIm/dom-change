ALTER TYPE "ExchangeRequestStatus" ADD VALUE 'COMPLETED';

ALTER TABLE "ExchangeRequest"
ADD COLUMN "cancelledById" UUID,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "completedAt" TIMESTAMP(3);
