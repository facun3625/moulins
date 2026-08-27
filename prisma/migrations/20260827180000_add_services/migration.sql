CREATE TYPE "ServiceFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'SELECT');
CREATE TABLE "Service" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "formTitle" TEXT NOT NULL, "submitLabel" TEXT NOT NULL DEFAULT 'Enviar consulta', "active" BOOLEAN NOT NULL DEFAULT true, "order" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Service_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ServiceField" ("id" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "label" TEXT NOT NULL, "type" "ServiceFieldType" NOT NULL DEFAULT 'TEXT', "required" BOOLEAN NOT NULL DEFAULT false, "options" TEXT[] DEFAULT ARRAY[]::TEXT[], "order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "ServiceField_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ServiceImage" ("id" TEXT NOT NULL, "serviceId" TEXT NOT NULL, "url" TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ServiceField_serviceId_order_idx" ON "ServiceField"("serviceId", "order");
CREATE INDEX "ServiceImage_serviceId_order_idx" ON "ServiceImage"("serviceId", "order");
ALTER TABLE "ServiceField" ADD CONSTRAINT "ServiceField_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
