ALTER TABLE "Amenity" ADD COLUMN "nightlyPoints" INTEGER NOT NULL DEFAULT 0;

UPDATE "Amenity" SET "nightlyPoints" = CASE code
  WHEN 'wifi' THEN 5
  WHEN 'workspace' THEN 5
  WHEN 'tv' THEN 2
  WHEN 'washing_machine' THEN 4
  WHEN 'dishwasher' THEN 4
  WHEN 'oven' THEN 3
  WHEN 'microwave' THEN 2
  WHEN 'air_conditioning' THEN 7
  WHEN 'heating' THEN 5
  WHEN 'balcony' THEN 4
  WHEN 'elevator' THEN 3
  WHEN 'parking' THEN 8
  WHEN 'baby_crib' THEN 3
  WHEN 'baby_chair' THEN 2
  WHEN 'accessible' THEN 8
  ELSE 0 END;

ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_nightlyPoints_range" CHECK ("nightlyPoints" BETWEEN 0 AND 100);
