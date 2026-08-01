CREATE TYPE "ExchangeType" AS ENUM ('POINTS', 'DIRECT');
CREATE TYPE "ExchangeRequestStatus" AS ENUM ('PENDING', 'PREAPPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ExchangeRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "targetPropertyId" UUID NOT NULL,
    "offeredPropertyId" UUID,
    "type" "ExchangeType" NOT NULL,
    "status" "ExchangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "guests" INTEGER NOT NULL,
    "message" TEXT,
    "pointsPerNightSnapshot" INTEGER,
    "totalPoints" INTEGER,
    "preapprovedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExchangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExchangeRequest_requesterId_status_createdAt_idx" ON "ExchangeRequest"("requesterId", "status", "createdAt");
CREATE INDEX "ExchangeRequest_hostId_status_createdAt_idx" ON "ExchangeRequest"("hostId", "status", "createdAt");
CREATE INDEX "ExchangeRequest_targetPropertyId_status_startsOn_endsOn_idx" ON "ExchangeRequest"("targetPropertyId", "status", "startsOn", "endsOn");

ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_targetPropertyId_fkey" FOREIGN KEY ("targetPropertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRequest" ADD CONSTRAINT "ExchangeRequest_offeredPropertyId_fkey" FOREIGN KEY ("offeredPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
