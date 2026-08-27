CREATE TYPE "ServiceInquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'QUOTED', 'RESPONDED', 'ACCEPTED', 'REJECTED', 'CLOSED');
CREATE TABLE "ServiceInquiry" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT,
  "serviceTitle" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "status" "ServiceInquiryStatus" NOT NULL DEFAULT 'NEW',
  "quotedAmount" DECIMAL(12,2),
  "internalNotes" TEXT,
  "telegramSent" BOOLEAN NOT NULL DEFAULT false,
  "emailSent" BOOLEAN NOT NULL DEFAULT false,
  "notificationError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceInquiry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ServiceInquiryEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "status" "ServiceInquiryStatus" NOT NULL,
  "quotedAmount" DECIMAL(12,2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceInquiryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ServiceInquiry_status_createdAt_idx" ON "ServiceInquiry"("status", "createdAt");
CREATE INDEX "ServiceInquiry_serviceId_idx" ON "ServiceInquiry"("serviceId");
CREATE INDEX "ServiceInquiryEvent_inquiryId_createdAt_idx" ON "ServiceInquiryEvent"("inquiryId", "createdAt");
ALTER TABLE "ServiceInquiry" ADD CONSTRAINT "ServiceInquiry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceInquiryEvent" ADD CONSTRAINT "ServiceInquiryEvent_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "ServiceInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
