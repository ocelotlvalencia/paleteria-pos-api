CREATE TABLE "CategoriaProducto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoriaProducto_nombre_key" ON "CategoriaProducto"("nombre");

INSERT INTO "CategoriaProducto" ("nombre")
SELECT DISTINCT TRIM("categoria")
FROM "Producto"
WHERE TRIM("categoria") <> ''
ON CONFLICT ("nombre") DO NOTHING;
