require('dotenv/config')

const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaNeon } = require('@prisma/adapter-neon')

const app = express()
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

const API_ACCESS_TOKEN = String(process.env.API_ACCESS_TOKEN || process.env.API_KEY || '').trim()
const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const authAttempts = new Map()

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})

app.use(cors({
  origin(origin, callback) {
    const isElectronFileOrigin = origin === 'null' || String(origin || '').startsWith('file://')

    if (!allowedOrigins.length || !origin || isElectronFileOrigin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origen no permitido por CORS'))
  }
}))
app.use(express.json({ limit: '6mb' }))

app.use((req, res, next) => {
  if (!API_ACCESS_TOKEN || req.method === 'OPTIONS' || req.path === '/' || req.path === '/api/health') {
    next()
    return
  }

  const authHeader = String(req.get('authorization') || '')
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : ''
  const apiKey = String(req.get('x-api-key') || bearerToken || '').trim()
  const expected = Buffer.from(API_ACCESS_TOKEN)
  const received = Buffer.from(apiKey)
  const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received)

  if (!isValid) {
    res.status(401).json({ error: 'API key requerida o invalida' })
    return
  }

  next()
})

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

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const hashLegacyPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(String(password || ''))
    .digest('hex')
}

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const iterations = 120000
  const key = crypto
    .pbkdf2Sync(String(password || ''), salt, iterations, 32, 'sha256')
    .toString('hex')

  return `pbkdf2$sha256$${iterations}$${salt}$${key}`
}

const verifyPassword = (password, storedHash = '') => {
  const hash = String(storedHash || '')

  if (hash.startsWith('pbkdf2$sha256$')) {
    const [, , iterationsValue, salt, key] = hash.split('$')
    const iterations = Math.max(1, Math.floor(Number(iterationsValue) || 0))
    const expected = Buffer.from(String(key || ''), 'hex')

    if (!salt || !expected.length) {
      return false
    }

    const received = crypto.pbkdf2Sync(String(password || ''), salt, iterations, expected.length, 'sha256')

    return expected.length === received.length && crypto.timingSafeEqual(expected, received)
  }

  const legacyHash = Buffer.from(hashLegacyPassword(password))
  const stored = Buffer.from(hash)

  return legacyHash.length === stored.length && crypto.timingSafeEqual(legacyHash, stored)
}

const normalizeCategoryName = (value) => String(value || '').trim()

const getClientKey = (req) => {
  return String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
}

const checkAuthRateLimit = (req) => {
  const windowMs = 15 * 60 * 1000
  const maxAttempts = 8
  const now = Date.now()
  const key = getClientKey(req)
  const record = authAttempts.get(key) || { count: 0, resetAt: now + windowMs }

  if (record.resetAt <= now) {
    record.count = 0
    record.resetAt = now + windowMs
  }

  record.count += 1
  authAttempts.set(key, record)

  return record.count <= maxAttempts
}

const clearAuthRateLimit = (req) => {
  authAttempts.delete(getClientKey(req))
}

let categoriaProductoStoragePromise = null
let pedidoCanceladoAtStoragePromise = null
let mermaProductoStoragePromise = null
let ventaPaymentStoragePromise = null

const ensureCategoriaProductoStorage = () => {
  if (!categoriaProductoStoragePromise) {
    categoriaProductoStoragePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CategoriaProducto" (
          "id" SERIAL NOT NULL,
          "nombre" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY ("id")
        )
      `)

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "CategoriaProducto_nombre_key"
        ON "CategoriaProducto"("nombre")
      `)

      await prisma.$executeRawUnsafe(`
        INSERT INTO "CategoriaProducto" ("nombre")
        SELECT DISTINCT TRIM("categoria")
        FROM "Producto"
        WHERE TRIM("categoria") <> ''
        ON CONFLICT ("nombre") DO NOTHING
      `)
    })().catch(error => {
      categoriaProductoStoragePromise = null
      throw error
    })
  }

  return categoriaProductoStoragePromise
}

const ensurePedidoCanceladoAtStorage = () => {
  if (!pedidoCanceladoAtStoragePromise) {
    pedidoCanceladoAtStoragePromise = prisma.$executeRawUnsafe(`
      ALTER TABLE "Pedido"
      ADD COLUMN IF NOT EXISTS "canceladoAt" TIMESTAMP(3)
    `).catch(error => {
      pedidoCanceladoAtStoragePromise = null
      throw error
    })
  }

  return pedidoCanceladoAtStoragePromise
}

const ensureMermaProductoStorage = () => {
  if (!mermaProductoStoragePromise) {
    mermaProductoStoragePromise = prisma.$executeRawUnsafe(`
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
      )
    `).then(() => prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MermaProducto_createdAt_idx"
      ON "MermaProducto"("createdAt")
    `)).catch(error => {
      mermaProductoStoragePromise = null
      throw error
    })
  }

  return mermaProductoStoragePromise
}

const ensureVentaPaymentStorage = () => {
  if (!ventaPaymentStoragePromise) {
    ventaPaymentStoragePromise = prisma.$executeRawUnsafe(`
      ALTER TABLE "Venta"
      ADD COLUMN IF NOT EXISTS "montoRecibido" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "cambio" DOUBLE PRECISION
    `).catch(error => {
      ventaPaymentStoragePromise = null
      throw error
    })
  }

  return ventaPaymentStoragePromise
}

const formatTicketNumber = (value) => {
  const ticketId = Math.max(0, Math.floor(Number(value) || 0))

  return `#${String(ticketId).padStart(4, '0')}`
}

const toDate = (value) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? new Date() : date
}

const buildPedidoItems = (pedido, concepto, total) => {
  return [{
    id: `pedido-${pedido.id}`,
    nombre: concepto,
    cantidad: 1,
    precioUnitario: total,
    total
  }]
}

const buildTicketText = ({ title = 'TICKET DE COMPRA', id, metodoPago, items = [], total, montoRecibido = null, cambio = null, concepto, cliente, telefono }) => {
  const hasPaymentDetails = montoRecibido !== null && montoRecibido !== undefined

  return [
    'PALETERIA NOPALUCAN',
    title,
    id ? `Folio ${formatTicketNumber(id)}` : 'Folio pendiente',
    concepto ? `Concepto: ${concepto}` : '',
    cliente ? `Cliente: ${cliente}` : '',
    telefono ? `Telefono: ${telefono}` : '',
    `Metodo: ${metodoPago || 'Efectivo'}`,
    '',
    'Detalle:',
    ...items.map(item => `${item.cantidad} x ${item.nombre} $${Number(item.total || 0).toFixed(2)}`),
    '',
    `Total: $${Number(total || 0).toFixed(2)}`,
    hasPaymentDetails ? `Pago recibido: $${Number(montoRecibido || 0).toFixed(2)}` : '',
    hasPaymentDetails ? `Cambio: $${Number(cambio || 0).toFixed(2)}` : '',
    '',
    'Gracias.'
  ].filter(Boolean).join('\n')
}

const getSaleProductItems = (items = []) => {
  const totals = new Map()

  items.forEach(item => {
    const productId = toOptionalNumber(item?.id)
    const quantity = Math.max(0, Math.floor(toNumber(item?.cantidad)))

    if (!productId || quantity <= 0) {
      return
    }

    totals.set(productId, (totals.get(productId) || 0) + quantity)
  })

  return Array.from(totals.entries()).map(([productId, quantity]) => ({
    productId,
    quantity
  }))
}

const discountSaleStock = async (tx, items = []) => {
  const productItems = getSaleProductItems(items)

  for (const item of productItems) {
    const product = await tx.producto.findUnique({
      where: {
        id: item.productId
      }
    })

    if (!product) {
      throw Object.assign(new Error('Producto no encontrado en el ticket'), { statusCode: 404 })
    }

    if (Number(product.stock || 0) < item.quantity) {
      throw Object.assign(
        new Error(`No hay stock suficiente de ${product.nombre}. Disponible: ${product.stock}`),
        { statusCode: 400 }
      )
    }

    const updated = await tx.producto.updateMany({
      where: {
        id: item.productId,
        stock: {
          gte: item.quantity
        }
      },
      data: {
        stock: {
          decrement: item.quantity
        }
      }
    })

    if (updated.count !== 1) {
      throw Object.assign(
        new Error(`No hay stock suficiente de ${product.nombre}. Disponible: ${product.stock}`),
        { statusCode: 400 }
      )
    }
  }
}

const getPedidoCanceladoAt = (estado, previousCanceladoAt = null) => {
  return estado === 'Cancelado' ? previousCanceladoAt || new Date() : null
}

const cleanupCanceledPedidos = async () => {
  await ensurePedidoCanceladoAtStorage()

  const expiresAt = new Date(Date.now() - 60 * 60 * 1000)

  await prisma.pedido.deleteMany({
    where: {
      estado: 'Cancelado',
      canceladoAt: {
        lte: expiresAt
      }
    }
  })
}

const createPedidoVenta = async ({ pedido, tipo, concepto, total, metodoPago }) => {
  await ensureVentaPaymentStorage()

  const items = buildPedidoItems(pedido, concepto, total)

  let venta = await prisma.venta.create({
    data: {
      total,
      metodoPago: metodoPago || 'Efectivo',
      tipo,
      concepto,
      pedidoId: pedido.id,
      items,
      ticket: null
    }
  })

  const ticket = buildTicketText({
    title: tipo,
    id: venta.id,
    metodoPago,
    items,
    total,
    concepto
  })

  venta = await prisma.venta.update({
    where: {
      id: venta.id
    },
    data: {
      ticket
    }
  })

  return venta
}

app.get('/', (req, res) => {
  res.json({
    message: 'API ONLINE'
  })
})

app.get('/api/health', asyncHandler(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`

  res.json({
    ok: true,
    service: 'paleteria-pos-api',
    database: 'connected'
  })
}))

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
      precioPremium: toOptionalNumber(req.body.precioPremium),
      precioMayoreo: toOptionalNumber(req.body.precioMayoreo),
      cantidadMayoreo: toOptionalNumber(req.body.cantidadMayoreo),
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
      precioPremium: toOptionalNumber(req.body.precioPremium),
      precioMayoreo: toOptionalNumber(req.body.precioMayoreo),
      cantidadMayoreo: toOptionalNumber(req.body.cantidadMayoreo),
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

app.get('/api/mermas', asyncHandler(async (req, res) => {
  await ensureMermaProductoStorage()

  const mermas = await prisma.$queryRaw`
    SELECT
      "id",
      "productoId",
      "productoNombre",
      "categoria",
      "cantidad",
      "motivo",
      "stockRestante",
      "createdAt"
    FROM "MermaProducto"
    ORDER BY "createdAt" DESC
  `

  res.json(mermas)
}))

app.post('/api/mermas', asyncHandler(async (req, res) => {
  await ensureMermaProductoStorage()

  const productoId = toNumber(req.body.productoId)
  const cantidad = Math.max(0, Math.floor(toNumber(req.body.cantidad)))
  const motivo = normalizeCategoryName(req.body.motivo) || 'Merma'

  if (!productoId || cantidad <= 0) {
    res.status(400).json({ error: 'Producto y cantidad de merma son requeridos' })
    return
  }

  const merma = await prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({
      where: {
        id: productoId
      }
    })

    if (!producto) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 })
    }

    if (cantidad > Number(producto.stock || 0)) {
      throw Object.assign(new Error('La merma no puede ser mayor al stock disponible'), { statusCode: 400 })
    }

    const stockRestante = Math.max(0, Number(producto.stock || 0) - cantidad)

    await tx.producto.update({
      where: {
        id: productoId
      },
      data: {
        stock: stockRestante
      }
    })

    const [createdMerma] = await tx.$queryRaw`
      INSERT INTO "MermaProducto" (
        "productoId",
        "productoNombre",
        "categoria",
        "cantidad",
        "motivo",
        "stockRestante"
      )
      VALUES (
        ${producto.id},
        ${producto.nombre},
        ${producto.categoria || 'General'},
        ${cantidad},
        ${motivo},
        ${stockRestante}
      )
      RETURNING
        "id",
        "productoId",
        "productoNombre",
        "categoria",
        "cantidad",
        "motivo",
        "stockRestante",
        "createdAt"
    `

    return createdMerma
  })

  res.status(201).json(merma)
}))

app.get('/api/categorias-productos', asyncHandler(async (req, res) => {
  await ensureCategoriaProductoStorage()

  const categorias = await prisma.categoriaProducto.findMany({
    orderBy: { nombre: 'asc' }
  })

  res.json(categorias)
}))

app.post('/api/categorias-productos', asyncHandler(async (req, res) => {
  await ensureCategoriaProductoStorage()

  const nombre = normalizeCategoryName(req.body.nombre)

  if (!nombre) {
    res.status(400).json({ error: 'El nombre de la categoria es requerido' })
    return
  }

  const categoria = await prisma.categoriaProducto.create({
    data: {
      nombre
    }
  })

  res.status(201).json(categoria)
}))

app.put('/api/categorias-productos/:id', asyncHandler(async (req, res) => {
  await ensureCategoriaProductoStorage()

  const nombre = normalizeCategoryName(req.body.nombre)

  if (!nombre) {
    res.status(400).json({ error: 'El nombre de la categoria es requerido' })
    return
  }

  const categoria = await prisma.categoriaProducto.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre
    }
  })

  res.json(categoria)
}))

app.delete('/api/categorias-productos/:id', asyncHandler(async (req, res) => {
  await ensureCategoriaProductoStorage()

  await prisma.categoriaProducto.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/materia-prima', asyncHandler(async (req, res) => {
  const materiaPrima = await prisma.materiaPrima.findMany({
    include: {
      proveedor: true,
      gasto: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json(materiaPrima)
}))

app.post('/api/materia-prima', asyncHandler(async (req, res) => {
  const costo = toNumber(req.body.costo)
  const materiaPrima = await prisma.$transaction(async (tx) => {
    const gasto = await tx.gasto.create({
      data: {
        concepto: `Materia prima: ${req.body.nombre}`,
        categoria: 'Insumos',
        monto: costo,
        notas: 'Gasto generado automaticamente desde Materia Prima'
      }
    })

    return tx.materiaPrima.create({
      data: {
        nombre: req.body.nombre,
        stock: toNumber(req.body.stock),
        unidad: req.body.unidad,
        costo,
        proveedorId: toOptionalNumber(req.body.proveedorId),
        gastoId: gasto.id
      },
      include: {
        proveedor: true,
        gasto: true
      }
    })
  })

  res.status(201).json(materiaPrima)
}))

app.put('/api/materia-prima/:id', asyncHandler(async (req, res) => {
  const id = toNumber(req.params.id)
  const costo = toNumber(req.body.costo)
  const materiaPrima = await prisma.$transaction(async (tx) => {
    const current = await tx.materiaPrima.findUnique({
      where: { id }
    })

    const gasto = current?.gastoId
      ? await tx.gasto.update({
          where: { id: current.gastoId },
          data: {
            concepto: `Materia prima: ${req.body.nombre}`,
            categoria: 'Insumos',
            monto: costo,
            notas: 'Gasto generado automaticamente desde Materia Prima'
          }
        })
      : await tx.gasto.create({
          data: {
            concepto: `Materia prima: ${req.body.nombre}`,
            categoria: 'Insumos',
            monto: costo,
            notas: 'Gasto generado automaticamente desde Materia Prima'
          }
        })

    return tx.materiaPrima.update({
      where: { id },
      data: {
        nombre: req.body.nombre,
        stock: toNumber(req.body.stock),
        unidad: req.body.unidad,
        costo,
        proveedorId: toOptionalNumber(req.body.proveedorId),
        gastoId: gasto.id
      },
      include: {
        proveedor: true,
        gasto: true
      }
    })
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
      categoria: req.body.categoria || 'General'
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
      categoria: req.body.categoria || 'General'
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
    include: {
      materias: true
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json(proveedores)
}))

app.post('/api/proveedores', asyncHandler(async (req, res) => {
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: req.body.nombre,
      contacto: req.body.contacto || null,
      telefono: req.body.telefono || null,
      descripcion: req.body.descripcion || null
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
      telefono: req.body.telefono || null,
      descripcion: req.body.descripcion || null
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

app.get('/api/usuarios', asyncHandler(async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nombre: true,
      rol: true,
      permisos: true,
      createdAt: true
    }
  })

  res.json(usuarios)
}))

app.post('/api/usuarios', asyncHandler(async (req, res) => {
  const permisos = Array.isArray(req.body.permisos) ? req.body.permisos : []
  const password = String(req.body.password || '').trim()

  if (!password) {
    res.status(400).json({ error: 'La contraseña es requerida' })
    return
  }

  const usuario = await prisma.usuario.create({
    data: {
      nombre: req.body.nombre,
      rol: req.body.rol || 'Usuario',
      passwordHash: hashPassword(password),
      permisos
    },
    select: {
      id: true,
      nombre: true,
      rol: true,
      permisos: true,
      createdAt: true
    }
  })

  res.status(201).json(usuario)
}))

app.put('/api/usuarios/:id', asyncHandler(async (req, res) => {
  const permisos = Array.isArray(req.body.permisos) ? req.body.permisos : []
  const password = String(req.body.password || '').trim()
  const usuario = await prisma.usuario.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      rol: req.body.rol || 'Usuario',
      ...(password ? { passwordHash: hashPassword(password) } : {}),
      permisos
    },
    select: {
      id: true,
      nombre: true,
      rol: true,
      permisos: true,
      createdAt: true
    }
  })

  res.json(usuario)
}))

app.post('/api/auth/verify', asyncHandler(async (req, res) => {
  if (!checkAuthRateLimit(req)) {
    res.status(429).json({ ok: false, error: 'Demasiados intentos. Intenta de nuevo mas tarde.' })
    return
  }

  const nombre = String(req.body.nombre || '').trim()
  const password = String(req.body.password || '').trim()
  const permiso = String(req.body.permiso || '').trim()
  const usuario = await prisma.usuario.findFirst({
    where: {
      nombre
    }
  })

  if (!usuario || !verifyPassword(password, usuario.passwordHash)) {
    res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' })
    return
  }

  clearAuthRateLimit(req)

  if (!String(usuario.passwordHash || '').startsWith('pbkdf2$sha256$')) {
    await prisma.usuario.update({
      where: {
        id: usuario.id
      },
      data: {
        passwordHash: hashPassword(password)
      }
    })
  }

  const permisos = Array.isArray(usuario.permisos) ? usuario.permisos : []

  const hasPermission = permiso === 'configuracion'
    ? permisos.some(item => item === 'configuracion' || String(item).startsWith('configuracion.'))
    : permisos.includes(permiso)

  if (permiso && !hasPermission) {
    res.status(403).json({ ok: false, error: 'No tienes permiso para acceder' })
    return
  }

  res.json({
    ok: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      permisos
    }
  })
}))

app.delete('/api/usuarios/:id', asyncHandler(async (req, res) => {
  await prisma.usuario.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/ventas', asyncHandler(async (req, res) => {
  await ensureVentaPaymentStorage()

  const ventas = await prisma.venta.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(ventas)
}))

app.post('/api/ventas', asyncHandler(async (req, res) => {
  await ensureVentaPaymentStorage()

  const items = Array.isArray(req.body.items) ? req.body.items : []
  const total = toNumber(req.body.total)
  const montoRecibido = req.body.montoRecibido === undefined || req.body.montoRecibido === null
    ? null
    : toNumber(req.body.montoRecibido)
  const cambio = req.body.cambio === undefined || req.body.cambio === null
    ? null
    : toNumber(req.body.cambio)
  const tipo = req.body.tipo || 'Venta'
  const shouldDiscountStock = tipo === 'Venta' || !req.body.tipo

  let venta = await prisma.$transaction(async (tx) => {
    if (shouldDiscountStock) {
      await discountSaleStock(tx, items)
    }

    return tx.venta.create({
      data: {
        total,
        montoRecibido,
        cambio,
        metodoPago: req.body.metodoPago || 'Efectivo',
        tipo,
        concepto: req.body.concepto || null,
        clienteId: toOptionalNumber(req.body.clienteId),
        cliente: req.body.cliente || null,
        telefono: req.body.telefono || null,
        pedidoId: toOptionalNumber(req.body.pedidoId),
        items,
        ticket: null
      }
    })
  })

  const ticket = req.body.ticket || buildTicketText({
    title: req.body.ticketTitle || (tipo === 'Venta' ? 'TICKET DE COMPRA' : tipo),
    id: venta.id,
    metodoPago: req.body.metodoPago || 'Efectivo',
    items,
    total,
    montoRecibido,
    cambio,
    concepto: req.body.concepto,
    cliente: req.body.cliente,
    telefono: req.body.telefono
  })

  venta = await prisma.venta.update({
    where: {
      id: venta.id
    },
    data: {
      ticket
    }
  })

  res.status(201).json(venta)
}))

app.delete('/api/ventas/:id', asyncHandler(async (req, res) => {
  await prisma.venta.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/gastos', asyncHandler(async (req, res) => {
  const gastos = await prisma.gasto.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(gastos)
}))

app.post('/api/gastos', asyncHandler(async (req, res) => {
  const gasto = await prisma.gasto.create({
    data: {
      concepto: req.body.concepto,
      categoria: req.body.categoria || 'General',
      monto: toNumber(req.body.monto),
      notas: req.body.notas || null
    }
  })

  res.status(201).json(gasto)
}))

app.put('/api/gastos/:id', asyncHandler(async (req, res) => {
  const gasto = await prisma.gasto.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      concepto: req.body.concepto,
      categoria: req.body.categoria || 'General',
      monto: toNumber(req.body.monto),
      notas: req.body.notas || null
    }
  })

  res.json(gasto)
}))

app.delete('/api/gastos/:id', asyncHandler(async (req, res) => {
  await prisma.gasto.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.get('/api/corte-caja', asyncHandler(async (req, res) => {
  const [ventas, gastos] = await Promise.all([
    prisma.venta.findMany(),
    prisma.gasto.findMany({
      orderBy: { createdAt: 'desc' }
    })
  ])
  const totalVentas = ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0)
  const totalGastos = gastos.reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0)

  res.json({
    totalVentas,
    totalGastos,
    saldo: totalVentas - totalGastos,
    ventasCount: ventas.length,
    gastosCount: gastos.length,
    gastos
  })
}))

app.get('/api/pedidos', asyncHandler(async (req, res) => {
  await cleanupCanceledPedidos()

  const pedidos = await prisma.pedido.findMany({
    orderBy: { fechaEntrega: 'asc' }
  })

  res.json(pedidos)
}))

app.post('/api/pedidos', asyncHandler(async (req, res) => {
  await ensurePedidoCanceladoAtStorage()

  const estado = req.body.estado || 'En preparación'
  const isCanceled = estado === 'Cancelado'
  let pedido = await prisma.pedido.create({
    data: {
      cliente: req.body.cliente,
      telefono: req.body.telefono || null,
      detalle: req.body.detalle,
      fechaEntrega: toDate(req.body.fechaEntrega),
      estado,
      total: toNumber(req.body.total),
      anticipo: toNumber(req.body.anticipo),
      metodoAnticipo: req.body.metodoAnticipo || null,
      canceladoAt: getPedidoCanceladoAt(estado)
    }
  })

  if (!isCanceled && pedido.anticipo > 0) {
    const venta = await createPedidoVenta({
      pedido,
      tipo: 'Anticipo',
      concepto: `Anticipo pedido #${pedido.id}`,
      total: pedido.anticipo,
      metodoPago: pedido.metodoAnticipo
    })

    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { anticipoVentaId: venta.id }
    })
  }

  if (!isCanceled && pedido.estado === 'Entregado') {
    const saldo = Math.max(Number(pedido.total || 0) - Number(pedido.anticipo || 0), 0)
    const venta = await createPedidoVenta({
      pedido,
      tipo: 'Pedido entregado',
      concepto: `Entrega pedido #${pedido.id}`,
      total: saldo,
      metodoPago: req.body.metodoEntrega || 'Efectivo'
    })

    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { entregaVentaId: venta.id }
    })
  }

  res.status(201).json(pedido)
}))

app.put('/api/pedidos/:id', asyncHandler(async (req, res) => {
  await ensurePedidoCanceladoAtStorage()

  const previousPedido = await prisma.pedido.findUnique({
    where: {
      id: toNumber(req.params.id)
    }
  })

  const estado = req.body.estado || 'En preparación'
  const isCanceled = estado === 'Cancelado'
  const anticipo = previousPedido?.anticipoVentaId
    ? Number(previousPedido.anticipo || 0)
    : toNumber(req.body.anticipo)
  const metodoAnticipo = previousPedido?.anticipoVentaId
    ? previousPedido.metodoAnticipo
    : req.body.metodoAnticipo || null
  let pedido = await prisma.pedido.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      cliente: req.body.cliente,
      telefono: req.body.telefono || null,
      detalle: req.body.detalle,
      fechaEntrega: toDate(req.body.fechaEntrega),
      estado,
      total: toNumber(req.body.total),
      anticipo,
      metodoAnticipo,
      canceladoAt: getPedidoCanceladoAt(estado, previousPedido?.canceladoAt)
    }
  })

  if (isCanceled) {
    const ventaIds = [previousPedido?.anticipoVentaId, previousPedido?.entregaVentaId]
      .filter(Boolean)

    if (ventaIds.length) {
      await prisma.venta.deleteMany({
        where: {
          id: {
            in: ventaIds
          }
        }
      })

      pedido = await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          anticipoVentaId: null,
          entregaVentaId: null
        }
      })
    }

    res.json(pedido)
    return
  }

  if (pedido.anticipo > 0 && !previousPedido?.anticipoVentaId) {
    const venta = await createPedidoVenta({
      pedido,
      tipo: 'Anticipo',
      concepto: `Anticipo pedido #${pedido.id}`,
      total: pedido.anticipo,
      metodoPago: pedido.metodoAnticipo
    })

    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { anticipoVentaId: venta.id }
    })
  }

  if (pedido.estado === 'Entregado' && previousPedido?.estado !== 'Entregado' && !previousPedido?.entregaVentaId) {
    const saldo = Math.max(Number(pedido.total || 0) - Number(pedido.anticipo || 0), 0)
    const venta = await createPedidoVenta({
      pedido,
      tipo: 'Pedido entregado',
      concepto: `Entrega pedido #${pedido.id}`,
      total: saldo,
      metodoPago: req.body.metodoEntrega || 'Efectivo'
    })

    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { entregaVentaId: venta.id }
    })
  }

  res.json(pedido)
}))

app.patch('/api/pedidos/:id/estado', asyncHandler(async (req, res) => {
  await ensurePedidoCanceladoAtStorage()

  const previousPedido = await prisma.pedido.findUnique({
    where: {
      id: toNumber(req.params.id)
    }
  })

  const estado = req.body.estado || 'En preparación'
  const isCanceled = estado === 'Cancelado'
  let pedido = await prisma.pedido.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      estado,
      canceladoAt: getPedidoCanceladoAt(estado, previousPedido?.canceladoAt)
    }
  })

  if (isCanceled) {
    const ventaIds = [previousPedido?.anticipoVentaId, previousPedido?.entregaVentaId]
      .filter(Boolean)

    if (ventaIds.length) {
      await prisma.venta.deleteMany({
        where: {
          id: {
            in: ventaIds
          }
        }
      })

      pedido = await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          anticipoVentaId: null,
          entregaVentaId: null
        }
      })
    }

    res.json(pedido)
    return
  }

  if (pedido.estado === 'Entregado' && previousPedido?.estado !== 'Entregado' && !previousPedido?.entregaVentaId) {
    const saldo = Math.max(Number(pedido.total || 0) - Number(pedido.anticipo || 0), 0)
    const venta = await createPedidoVenta({
      pedido,
      tipo: 'Pedido entregado',
      concepto: `Entrega pedido #${pedido.id}`,
      total: saldo,
      metodoPago: req.body.metodoEntrega || 'Efectivo'
    })

    pedido = await prisma.pedido.update({
      where: { id: pedido.id },
      data: { entregaVentaId: venta.id }
    })
  }

  res.json(pedido)
}))

app.delete('/api/pedidos/:id', asyncHandler(async (req, res) => {
  await prisma.pedido.delete({
    where: {
      id: toNumber(req.params.id)
    }
  })

  res.status(204).send()
}))

app.use((error, req, res, next) => {
  console.error(error)

  const statusCode = Number(error.statusCode || 500)

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor' : error.message
  })
})

if (require.main === module) {
  const port = process.env.PORT || 3000

  app.listen(port, () => {
    console.log(`SERVER RUNNING ON PORT ${port}`)
  })
}

module.exports = app
