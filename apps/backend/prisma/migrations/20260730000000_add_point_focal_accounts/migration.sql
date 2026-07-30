ALTER TYPE "UserRole" ADD VALUE 'POINT_FOCAL';

ALTER TABLE "User"
  ADD COLUMN "middleName" TEXT,
  ADD COLUMN "functionTitle" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "ministryId" TEXT,
  ADD COLUMN "otherInstitutionName" TEXT;

ALTER TABLE "ResourceRequest"
  ADD COLUMN "pointFocalUserId" TEXT;

CREATE INDEX "User_ministryId_idx" ON "User"("ministryId");
CREATE INDEX "ResourceRequest_pointFocalUserId_idx" ON "ResourceRequest"("pointFocalUserId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_ministryId_fkey"
  FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceRequest"
  ADD CONSTRAINT "ResourceRequest_pointFocalUserId_fkey"
  FOREIGN KEY ("pointFocalUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
