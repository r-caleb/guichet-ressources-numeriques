-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'ADDITIONAL_DOCUMENTS_REQUESTED', 'APPROVED', 'REJECTED', 'RESOURCES_ASSIGNED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('GOVERNMENT_SUBDOMAIN', 'HOSTING_SPACE', 'SUBDOMAIN_AND_HOSTING', 'RESOURCE_MODIFICATION', 'ACCESS_RESET', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('INSTITUTIONAL_SITE', 'WEB_APPLICATION', 'SERVICE_PORTAL', 'INTRANET', 'OTHER');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('CITIZENS', 'BUSINESSES', 'PUBLIC_AGENTS', 'INSTITUTIONAL_PARTNERS', 'INTERNAL_ONLY');

-- CreateEnum
CREATE TYPE "CriticalityLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DomainChoiceRank" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OFFICIAL_REQUEST_LETTER', 'FOCAL_POINT_DESIGNATION', 'ADDITIONAL_DOCUMENT');

-- CreateEnum
CREATE TYPE "AccessTransmissionMode" AS ENUM ('OFFICIAL_LETTER', 'OFFICIAL_EMAIL', 'PHYSICAL_HANDOVER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REQUEST_CREATED', 'STATUS_CHANGED', 'DOCUMENT_ADDED', 'ADMIN_NOTE_ADDED', 'RESOURCE_ASSIGNED', 'REQUEST_CLOSED', 'USER_LOGIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "roles" "UserRole"[] DEFAULT ARRAY['AGENT']::"UserRole"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "officialEmailDomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "focalLastName" TEXT NOT NULL,
    "focalMiddleName" TEXT NOT NULL,
    "focalFirstName" TEXT NOT NULL,
    "focalFunction" TEXT NOT NULL,
    "focalDepartment" TEXT NOT NULL,
    "focalPhone" TEXT NOT NULL,
    "focalEmail" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "requestTypes" "RequestType"[],
    "requestDetails" TEXT,
    "platformName" TEXT NOT NULL,
    "platformType" "PlatformType" NOT NULL,
    "audience" "AudienceType" NOT NULL,
    "criticality" "CriticalityLevel" NOT NULL DEFAULT 'NORMAL',
    "existingUrl" TEXT,
    "targetDate" TIMESTAMP(3),
    "officialPurpose" TEXT NOT NULL,
    "technicalContact" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "instructorId" TEXT,
    "assignedDomain" TEXT,
    "hostingAssigned" BOOLEAN NOT NULL DEFAULT false,
    "resourcesCreatedAt" TIMESTAMP(3),
    "accessDeliveredAt" TIMESTAMP(3),
    "accessTransmissionMode" "AccessTransmissionMode",
    "administrativeNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDomainChoice" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "rank" "DomainChoiceRank" NOT NULL,
    "prefix" TEXT NOT NULL,
    "fullDomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDomainChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "localPath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "message" TEXT NOT NULL,
    "requestId" TEXT,
    "actorId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_name_key" ON "Ministry"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRequest_number_key" ON "ResourceRequest"("number");

-- CreateIndex
CREATE INDEX "ResourceRequest_status_idx" ON "ResourceRequest"("status");

-- CreateIndex
CREATE INDEX "ResourceRequest_ministryId_idx" ON "ResourceRequest"("ministryId");

-- CreateIndex
CREATE INDEX "ResourceRequest_createdAt_idx" ON "ResourceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RequestDomainChoice_prefix_idx" ON "RequestDomainChoice"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "RequestDomainChoice_rank_requestId_key" ON "RequestDomainChoice"("rank", "requestId");

-- CreateIndex
CREATE INDEX "RequestDocument_requestId_idx" ON "RequestDocument"("requestId");

-- CreateIndex
CREATE INDEX "RequestDocument_type_idx" ON "RequestDocument"("type");

-- CreateIndex
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDomainChoice" ADD CONSTRAINT "RequestDomainChoice_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ResourceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestDocument" ADD CONSTRAINT "RequestDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ResourceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ResourceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
