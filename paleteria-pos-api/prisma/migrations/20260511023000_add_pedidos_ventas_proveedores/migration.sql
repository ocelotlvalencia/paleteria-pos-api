ALTER TABLE "Cliente" DROP COLUMN IF EXISTS "puntos";

ALTER TABLE "Proveedor"
ADD COLUMN "descripcion" TEXT;

ALTER TABLE "MateriaPrima"
ADD COLUMN "proveedorId" INTEGER;

ALTER TABLE "MateriaPrima"
ADD CONSTRAINT "MateriaPrima_proveedorId_fkey"
FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Venta"
ADD COLUMN "items" JSONB;

CREATE TABLE "Pedido" (
  "id" SERIAL NOT NULL,
  "cliente" TEXT NOT NULL,
  "telefono" TEXT,
  "detalle" TEXT NOT NULL,
  "fechaEntrega" TIMESTAMP(3) NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'Pendiente',
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);
