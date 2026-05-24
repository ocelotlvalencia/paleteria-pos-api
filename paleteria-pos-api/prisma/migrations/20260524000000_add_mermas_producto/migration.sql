CREATE TABLE IF NOT EXISTS "MermaProducto" (
  "id" SERIAL NOT NULL,
  "productoId" INTEGER NOT NULL,
  "productoNombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL DEFAULT 'General',
  "cantidad" INTEGER NOT NULL,
  "motivo" TEXT,
  "stockRestante" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MermaProducto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MermaProducto_createdAt_idx"
ON "MermaProducto"("createdAt");
