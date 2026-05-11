-- AlterTable
ALTER TABLE "MateriaPrima" ADD COLUMN "costo" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "MateriaPrima" ADD COLUMN "gastoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MateriaPrima_gastoId_key" ON "MateriaPrima"("gastoId");

-- AddForeignKey
ALTER TABLE "MateriaPrima" ADD CONSTRAINT "MateriaPrima_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "Gasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
