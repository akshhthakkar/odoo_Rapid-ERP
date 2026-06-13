-- CreateEnum
CREATE TYPE "ReplenishmentStatus" AS ENUM ('NOT_STARTED', 'TRIGGERED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "ManufacturingOrder" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "salesOrderId" INTEGER;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "requestedDeliveryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "replenishmentStatus" "ReplenishmentStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
