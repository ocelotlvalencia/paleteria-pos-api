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
