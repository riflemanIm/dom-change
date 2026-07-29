-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "acceptsDirect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptsPoints" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasPetsAtHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresPetCare" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresPlantCare" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "title" SET DEFAULT 'Новое жильё',
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "type" SET DEFAULT 'OTHER',
ALTER COLUMN "bedroomsCount" SET DEFAULT 1,
ALTER COLUMN "bedsCount" SET DEFAULT 1,
ALTER COLUMN "maxGuests" SET DEFAULT 1,
ALTER COLUMN "pointsPerNight" SET DEFAULT 100;

-- CreateTable
CREATE TABLE "PropertyRule" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "smokingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "eventsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "additionalRules" TEXT,

    CONSTRAINT "PropertyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAmenity" (
    "propertyId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("propertyId","amenityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyRule_propertyId_key" ON "PropertyRule"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_code_key" ON "Amenity"("code");

-- CreateIndex
CREATE INDEX "Amenity_isActive_sortOrder_idx" ON "Amenity"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "PropertyRule" ADD CONSTRAINT "PropertyRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
