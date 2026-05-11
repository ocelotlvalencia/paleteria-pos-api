-- CreateTable
CREATE TABLE "Gasto" (
    "id" SERIAL NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'General',
    "monto" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);
