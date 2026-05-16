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

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
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

const buildTicketText = ({ title = 'TICKET DE COMPRA', id, metodoPago, items = [], total, concepto, cliente, telefono }) => {
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
    '',
    'Gracias.'
  ].filter(Boolean).join('\n')
}

const createPedidoVenta = async ({ pedido, tipo, concepto, total, metodoPago }) => {
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
      telefono: req.body.telefono || null
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
      telefono: req.body.telefono || null
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
    orderBy: { createdAt: 'desc' }
  })

  res.json(usuarios)
}))

app.post('/api/usuarios', asyncHandler(async (req, res) => {
  const permisos = Array.isArray(req.body.permisos) ? req.body.permisos : []
  const usuario = await prisma.usuario.create({
    data: {
      nombre: req.body.nombre,
      rol: req.body.rol || 'Usuario',
      permisos
    }
  })

  res.status(201).json(usuario)
}))

app.put('/api/usuarios/:id', asyncHandler(async (req, res) => {
  const permisos = Array.isArray(req.body.permisos) ? req.body.permisos : []
  const usuario = await prisma.usuario.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      nombre: req.body.nombre,
      rol: req.body.rol || 'Usuario',
      permisos
    }
  })

  res.json(usuario)
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
  const ventas = await prisma.venta.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(ventas)
}))

app.post('/api/ventas', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  let venta = await prisma.venta.create({
    data: {
      total: toNumber(req.body.total),
      metodoPago: req.body.metodoPago || 'Efectivo',
      tipo: req.body.tipo || 'Venta',
      concepto: req.body.concepto || null,
      clienteId: toOptionalNumber(req.body.clienteId),
      cliente: req.body.cliente || null,
      telefono: req.body.telefono || null,
      pedidoId: toOptionalNumber(req.body.pedidoId),
      items,
      ticket: null
    }
  })

  const ticket = req.body.ticket || buildTicketText({
    title: req.body.ticketTitle || (req.body.tipo === 'Venta' || !req.body.tipo ? 'TICKET DE COMPRA' : req.body.tipo),
    id: venta.id,
    metodoPago: req.body.metodoPago || 'Efectivo',
    items,
    total: toNumber(req.body.total),
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
  const pedidos = await prisma.pedido.findMany({
    orderBy: { fechaEntrega: 'asc' }
  })

  res.json(pedidos)
}))

app.post('/api/pedidos', asyncHandler(async (req, res) => {
  let pedido = await prisma.pedido.create({
    data: {
      cliente: req.body.cliente,
      telefono: req.body.telefono || null,
      detalle: req.body.detalle,
      fechaEntrega: toDate(req.body.fechaEntrega),
      estado: req.body.estado || 'En preparación',
      total: toNumber(req.body.total),
      anticipo: toNumber(req.body.anticipo),
      metodoAnticipo: req.body.metodoAnticipo || null
    }
  })

  if (pedido.anticipo > 0) {
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

  if (pedido.estado === 'Entregado') {
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
  const previousPedido = await prisma.pedido.findUnique({
    where: {
      id: toNumber(req.params.id)
    }
  })

  let pedido = await prisma.pedido.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      cliente: req.body.cliente,
      telefono: req.body.telefono || null,
      detalle: req.body.detalle,
      fechaEntrega: toDate(req.body.fechaEntrega),
      estado: req.body.estado || 'En preparación',
      total: toNumber(req.body.total),
      anticipo: toNumber(req.body.anticipo),
      metodoAnticipo: req.body.metodoAnticipo || null
    }
  })

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
  const previousPedido = await prisma.pedido.findUnique({
    where: {
      id: toNumber(req.params.id)
    }
  })

  let pedido = await prisma.pedido.update({
    where: {
      id: toNumber(req.params.id)
    },
    data: {
      estado: req.body.estado || 'En preparación'
    }
  })

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
