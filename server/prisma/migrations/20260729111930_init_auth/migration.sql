-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('NEW', 'EMAIL_VERIFIED', 'CONTACTS_VERIFIED', 'VERIFIED_MEMBER', 'TRUSTED_MEMBER');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'PUBLISHED', 'CHANGES_REQUESTED', 'REJECTED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'TOWNHOUSE', 'COTTAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('UNAVAILABLE', 'POINTS', 'DIRECT', 'BOTH', 'ON_REQUEST');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('BONUS', 'RESERVE', 'RELEASE', 'DEBIT', 'HOST_PENDING', 'HOST_CREDIT', 'REFUND', 'COMPENSATION', 'ADMIN_ADJUSTMENT', 'EXPIRATION', 'FREEZE', 'UNFREEZE');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'NEW',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "surname" TEXT,
    "patronymic" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "city" TEXT,
    "description" TEXT,
    "adultsCount" INTEGER NOT NULL DEFAULT 1,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "hasPets" BOOLEAN NOT NULL DEFAULT false,
    "interests" TEXT[],
    "travelPreferences" TEXT[],
    "hostRating" DECIMAL(2,1),
    "guestRating" DECIMAL(2,1),
    "completedExchanges" INTEGER NOT NULL DEFAULT 0,
    "cancellationsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "VerificationType" NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "areaSqm" INTEGER,
    "roomsCount" INTEGER,
    "bedroomsCount" INTEGER NOT NULL,
    "bedsCount" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "floor" INTEGER,
    "floorsTotal" INTEGER,
    "hasElevator" BOOLEAN NOT NULL DEFAULT false,
    "allowsChildren" BOOLEAN NOT NULL DEFAULT true,
    "allowsPets" BOOLEAN NOT NULL DEFAULT false,
    "pointsPerNight" INTEGER NOT NULL,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxNights" INTEGER,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAddress" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "latitudeApprox" DECIMAL(9,6),
    "longitudeApprox" DECIMAL(9,6),
    "exactAddress" TEXT,
    "checkInInstructions" TEXT,
    "keyHandoverInfo" TEXT,

    CONSTRAINT "PropertyAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityPeriod" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "type" "AvailabilityType" NOT NULL,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxNights" INTEGER,
    "pointsPerNight" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","propertyId")
);

-- CreateTable
CREATE TABLE "PointAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "available" BIGINT NOT NULL DEFAULT 0,
    "reserved" BIGINT NOT NULL DEFAULT 0,
    "pending" BIGINT NOT NULL DEFAULT 0,
    "bonus" BIGINT NOT NULL DEFAULT 0,
    "frozen" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ContactVerification_userId_type_createdAt_idx" ON "ContactVerification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ContactVerification_target_type_idx" ON "ContactVerification"("target", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_status_createdAt_idx" ON "Property"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Property_ownerId_status_idx" ON "Property"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAddress_propertyId_key" ON "PropertyAddress"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAddress_country_city_district_idx" ON "PropertyAddress"("country", "city", "district");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPhoto_storageKey_key" ON "PropertyPhoto"("storageKey");

-- CreateIndex
CREATE INDEX "PropertyPhoto_propertyId_sortOrder_idx" ON "PropertyPhoto"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "AvailabilityPeriod_propertyId_startsOn_endsOn_idx" ON "AvailabilityPeriod"("propertyId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "PointAccount_userId_key" ON "PointAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_idempotencyKey_key" ON "PointTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PointTransaction_accountId_createdAt_idx" ON "PointTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "PointTransaction_sourceType_sourceId_idx" ON "PointTransaction"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVerification" ADD CONSTRAINT "ContactVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAddress" ADD CONSTRAINT "PropertyAddress_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityPeriod" ADD CONSTRAINT "AvailabilityPeriod_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointAccount" ADD CONSTRAINT "PointAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PointAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
