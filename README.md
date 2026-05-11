# ASTL Finance V1.0

Sistema POS para Paleteria Nopalucan.

## Estructura

```text
app/                 Aplicacion de escritorio con Electron
paleteria-pos-api/   API con Express y Prisma
```

## Comandos

Ejecutar la aplicacion de escritorio:

```bash
cd app
npm install
npm run dev
```

Ejecutar la API:

```bash
cd paleteria-pos-api
npm install
npm run dev
```

## Variables de entorno

La API necesita un archivo `.env` dentro de `paleteria-pos-api/`.
Usa `paleteria-pos-api/.env.example` como base.

## Neon y Vercel

En Neon crea una base PostgreSQL y copia estas URLs:

- `DATABASE_URL`: URL pooled para runtime.
- `DIRECT_URL`: URL directa para migraciones.

En Vercel configura esas mismas variables dentro del proyecto de la API.
Si Neon ya creo `DATABASE_URL` y `DATABASE_URL_UNPOOLED`, no necesitas crear
`DIRECT_URL` manualmente.
Despues ejecuta las migraciones:

```bash
cd paleteria-pos-api
npm run prisma:migrate
```

Cuando Vercel te entregue la URL de la API, abre la app, entra a
`Configuracion` y guarda esa URL en la tarjeta `API`.
