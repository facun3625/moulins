-- CreateTable
CREATE TABLE "DeliveryDateCost" (
    "id" TEXT NOT NULL,
    "deliveryDateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryDateCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryDateCost_deliveryDateId_idx" ON "DeliveryDateCost"("deliveryDateId");

-- AddForeignKey
ALTER TABLE "DeliveryDateCost" ADD CONSTRAINT "DeliveryDateCost_deliveryDateId_fkey" FOREIGN KEY ("deliveryDateId") REFERENCES "DeliveryDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
