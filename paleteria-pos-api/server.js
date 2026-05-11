require('dotenv/config')

const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')
const { PrismaNeon } = require('@prisma/adapter-neon')

const app = express()
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

app.use(cors())
app.use(express.json({ limit: '6mb' }))

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    next(error)
  }
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

app.get('/', (req, res) => {
  res.json({
    message: 'API ONLINE'
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'paleteria-pos-api'
  })
})

app.get('/api/productos', asyncHandler(async (req, res) => {
  const productos = await prisma.producto.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(productos)
}))

app.post('/api/productos', asyncHandler(async (req, res) => {
  const producto = await prisma.producto.create({
    data: {
      nombre: req.body.nombre,
      precio: toNumber(req.body.precio),
      categoria: req.body.categoria,
      imagen: req.body.imagen || null,
      stock: toNumber(req.body.stock)
    }
  })

  res.status(201).json(producto)
}))

app.put('/api/productos/:id', asyncHandler(async (req, res) => {
  const producto = await prisma.producto.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      precio: toNumber(req.body.precio),
      categoria: req.body.categoria,
      imagen: req.body.imagen || null,
      stock: toNumber(req.body.stock)
    }
  })

  res.json(producto)
}))

app.delete('/api/productos/:id', asyncHandler(async (req, res) => {
  await prisma.producto.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/materia-prima', asyncHandler(async (req, res) => {
  const materiaPrima = await prisma.materiaPrima.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(materiaPrima)
}))

app.post('/api/materia-prima', asyncHandler(async (req, res) => {
  const materiaPrima = await prisma.materiaPrima.create({
    data: {
      nombre: req.body.nombre,
      stock: toNumber(req.body.stock),
      unidad: req.body.unidad
    }
  })

  res.status(201).json(materiaPrima)
}))

app.put('/api/materia-prima/:id', asyncHandler(async (req, res) => {
  const materiaPrima = await prisma.materiaPrima.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      stock: toNumber(req.body.stock),
      unidad: req.body.unidad
    }
  })

  res.json(materiaPrima)
}))

app.delete('/api/materia-prima/:id', asyncHandler(async (req, res) => {
  await prisma.materiaPrima.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/clientes', asyncHandler(async (req, res) => {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(clientes)
}))

app.post('/api/clientes', asyncHandler(async (req, res) => {
  const cliente = await prisma.cliente.create({
    data: {
      nombre: req.body.nombre,
      telefono: req.body.telefono || null,
      puntos: toNumber(req.body.puntos)
    }
  })

  res.status(201).json(cliente)
}))

app.put('/api/clientes/:id', asyncHandler(async (req, res) => {
  const cliente = await prisma.cliente.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      telefono: req.body.telefono || null,
      puntos: toNumber(req.body.puntos)
    }
  })

  res.json(cliente)
}))

app.delete('/api/clientes/:id', asyncHandler(async (req, res) => {
  await prisma.cliente.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/proveedores', asyncHandler(async (req, res) => {
  const proveedores = await prisma.proveedor.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(proveedores)
}))

app.post('/api/proveedores', asyncHandler(async (req, res) => {
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: req.body.nombre,
      contacto: req.body.contacto || null,
      telefono: req.body.telefono || null
    }
  })

  res.status(201).json(proveedor)
}))

app.put('/api/proveedores/:id', asyncHandler(async (req, res) => {
  const proveedor = await prisma.proveedor.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      contacto: req.body.contacto || null,
      telefono: req.body.telefono || null
    }
  })

  res.json(proveedor)
}))

app.delete('/api/proveedores/:id', asyncHandler(async (req, res) => {
  await prisma.proveedor.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.use((error, req, res, next) => {
  console.error(error)

  res.status(500).json({
    error: 'Error interno del servidor'
  })
})

if (require.main === module) {
  const port = process.env.PORT || 3000

  app.listen(port, () => {
    console.log(`SERVER RUNNING ON PORT ${port}`)
  })
}

module.exports = app
