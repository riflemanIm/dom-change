CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

CREATE TABLE "PropertyModerationDecision" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "moderatorId" UUID NOT NULL,
    "fromStatus" "PropertyStatus" NOT NULL,
    "toStatus" "PropertyStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyModerationDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyModerationDecision_propertyId_createdAt_idx" ON "PropertyModerationDecision"("propertyId", "createdAt");
CREATE INDEX "PropertyModerationDecision_moderatorId_createdAt_idx" ON "PropertyModerationDecision"("moderatorId", "createdAt");
ALTER TABLE "PropertyModerationDecision" ADD CONSTRAINT "PropertyModerationDecision_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyModerationDecision" ADD CONSTRAINT "PropertyModerationDecision_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
