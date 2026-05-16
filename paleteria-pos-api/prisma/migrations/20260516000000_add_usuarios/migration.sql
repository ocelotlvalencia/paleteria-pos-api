CREATE TABLE "Usuario" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'Usuario',
  "permisos" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);
