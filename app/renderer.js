const buttons = document.querySelectorAll('.category')
const sections = document.querySelectorAll('.section')

const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')
const closeModal = document.getElementById('close-modal')

const productsContainer = document.getElementById('products-container')
const materiaContainer = document.getElementById('materia-container')
const clientesContainer = document.getElementById('clientes-container')
const pedidosContainer = document.getElementById('pedidos-container')
const ventasContainer = document.getElementById('ventas-container')
const proveedoresContainer = document.getElementById('proveedores-container')
const stockAlerts = document.getElementById('stock-alerts')
const settingsGrid = document.querySelector('#configuracion .settings-grid')
const systemStatus = document.getElementById('system-status')
const statusText = document.getElementById('status-text')
const cartItemsContainer = document.getElementById('cart-items')
const cartSubtotal = document.getElementById('cart-subtotal')
const cartTotal = document.getElementById('cart-total')
const ticketPaymentMethod = document.getElementById('ticket-payment-method')
const chargeTicket = document.getElementById('charge-ticket')
const cancelTicket = document.getElementById('cancel-ticket')
const themeToggle = document.getElementById('theme-toggle')

const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'
const LEGACY_LOCAL_API_URLS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])

let productosState = []
let materiaState = []
let clientesState = []
let pedidosState = []
let ventasState = []
let proveedoresState = []
let ticketItems = []
let apiUrlState = DEFAULT_API_URL
let configPathState = ''

const applyTheme = (theme) => {
  document.body.classList.toggle('dark-mode', theme === 'dark')
  localStorage.setItem('theme', theme)
}

const resourceConfig = {
  producto: {
    path: '/api/productos',
    label: 'producto',
    state: () => productosState,
    open: (record) => openModal('producto', record)
  },
  materia: {
    path: '/api/materia-prima',
    label: 'materia prima',
    state: () => materiaState,
    open: (record) => openModal('materia', record)
  },
  cliente: {
    path: '/api/clientes',
    label: 'cliente',
    state: () => clientesState,
    open: (record) => openModal('cliente', record)
  },
  pedido: {
    path: '/api/pedidos',
    label: 'pedido',
    state: () => pedidosState,
    open: (record) => openModal('pedido', record)
  },
  venta: {
    path: '/api/ventas',
    label: 'venta',
    state: () => ventasState
  },
  proveedor: {
    path: '/api/proveedores',
    label: 'proveedor',
    state: () => proveedoresState,
    open: (record) => openModal('proveedor', record)
  }
}

const initConfig = async () => {
  if (!window.appConfig) {
    apiUrlState = DEFAULT_API_URL
    return
  }

  const [apiUrl, configPath] = await Promise.all([
    window.appConfig.getApiUrl(),
    window.appConfig.getConfigPath()
  ])

  apiUrlState = LEGACY_LOCAL_API_URLS.has(apiUrl) ? DEFAULT_API_URL : apiUrl
  configPathState = configPath
}

const getApiUrl = () => {
  return apiUrlState
}

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${getApiUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`Error ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const money = (value) => {
  return `$${Number(value || 0).toFixed(2)}`
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

const toDatetimeLocalValue = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)

  return offsetDate.toISOString().slice(0, 16)
}

const summarizeItems = (items = []) => {
  if (!Array.isArray(items) || !items.length) {
    return 'Sin productos'
  }

  return items
    .map(item => `${item.cantidad} x ${item.nombre}`)
    .join(', ')
}

const getTicketItems = () => {
  return ticketItems.map(item => ({
    id: item.id,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioUnitario: getWholesalePrice(item),
    total: getWholesalePrice(item) * item.cantidad
  }))
}

const getTicketTotal = () => {
  return getTicketItems().reduce((sum, item) => sum + item.total, 0)
}

const isWholesaleActive = (item) => {
  const cantidadMayoreo = Number(item.cantidadMayoreo || 0)
  const precioMayoreo = Number(item.precioMayoreo || 0)

  return cantidadMayoreo > 0 && precioMayoreo > 0 && item.cantidad >= cantidadMayoreo
}

const getWholesalePrice = (item) => {
  return isWholesaleActive(item)
    ? Number(item.precioMayoreo || 0)
    : Number(item.precio || 0)
}

const getWholesaleLabel = (item) => {
  const cantidadMayoreo = Number(item.cantidadMayoreo || 0)

  if (isWholesaleActive(item)) {
    return `Mayoreo desde ${cantidadMayoreo} pzas`
  }

  return ''
}

const renderTicketItem = (item) => {
  const unitPrice = getWholesalePrice(item)
  const wholesaleLabel = getWholesaleLabel(item)

  return `
    <article class="cart-item" data-ticket-id="${escapeHtml(item.id)}">
      <div class="cart-item-info">
        <h4>${escapeHtml(item.nombre)}</h4>
        <p>${money(unitPrice)} c/u${wholesaleLabel ? ` &middot; ${escapeHtml(wholesaleLabel)}` : ''}</p>
      </div>

      <div class="quantity-control">
        <button type="button" data-ticket-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
        <input type="number" min="1" step="1" value="${escapeHtml(item.cantidad)}" data-ticket-action="quantity" data-id="${escapeHtml(item.id)}">
        <button type="button" data-ticket-action="increase" data-id="${escapeHtml(item.id)}">+</button>
      </div>

      <strong>${money(unitPrice * item.cantidad)}</strong>
      <button class="remove-ticket-item" type="button" data-ticket-action="remove" data-id="${escapeHtml(item.id)}">&times;</button>
    </article>
  `
}

const showAppDialog = ({
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  danger = false,
  showCancel = true
}) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'app-dialog show-modal'
    dialog.innerHTML = `
      <div class="app-dialog-content">
        <div class="app-dialog-icon ${danger ? 'danger' : 'info'}">
          ${danger ? '!' : 'i'}
        </div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="app-dialog-actions">
          ${showCancel ? `<button class="dialog-btn secondary" type="button" data-dialog-action="cancel">${escapeHtml(cancelText)}</button>` : ''}
          <button class="dialog-btn ${danger ? 'danger' : 'primary'}" type="button" data-dialog-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `

    const closeDialog = (result) => {
      dialog.remove()
      resolve(result)
    }

    dialog.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-dialog-action]')

      if (actionButton?.dataset.dialogAction === 'confirm') {
        closeDialog(true)
        return
      }

      if (actionButton?.dataset.dialogAction === 'cancel' || event.target === dialog) {
        closeDialog(false)
      }
    })

    document.body.appendChild(dialog)
    dialog.querySelector('[data-dialog-action="confirm"]').focus()
  })
}

const showTicketDialog = (title, content) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'app-dialog show-modal'
    dialog.innerHTML = `
      <div class="app-dialog-content ticket-dialog">
        <h2>${escapeHtml(title)}</h2>
        <pre>${escapeHtml(content)}</pre>
        <div class="app-dialog-actions">
          <button class="dialog-btn secondary" type="button" data-dialog-action="cancel">Cerrar</button>
          <button class="dialog-btn primary" type="button" data-dialog-action="confirm">Imprimir</button>
        </div>
      </div>
    `

    const closeDialog = () => {
      dialog.remove()
      resolve()
    }

    dialog.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-dialog-action]')

      if (actionButton?.dataset.dialogAction === 'confirm') {
        window.print()
        closeDialog()
        return
      }

      if (actionButton?.dataset.dialogAction === 'cancel' || event.target === dialog) {
        closeDialog()
      }
    })

    document.body.appendChild(dialog)
  })
}

const showPedidoStatusDialog = (pedido) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'app-dialog show-modal'
    dialog.innerHTML = `
      <div class="app-dialog-content">
        <h2>Estado del pedido</h2>
        <p>${escapeHtml(pedido.cliente)} &middot; Pedido #${escapeHtml(pedido.id)}</p>
        <form class="status-form">
          <div class="form-group">
            <label>Estado</label>
            <select name="estado" required>
              <option ${pedido.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
              <option ${pedido.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
              <option ${pedido.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </div>
          <div class="form-group">
            <label>M&eacute;todo al entregar</label>
            <select name="metodoEntrega">
              <option>Efectivo</option>
              <option>Tarjeta</option>
            </select>
          </div>
          <div class="app-dialog-actions">
            <button class="dialog-btn secondary" type="button" data-dialog-action="cancel">Cancelar</button>
            <button class="dialog-btn primary" type="submit">Guardar</button>
          </div>
        </form>
      </div>
    `

    const closeDialog = (result) => {
      dialog.remove()
      resolve(result)
    }

    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-dialog-action="cancel"]') || event.target === dialog) {
        closeDialog(null)
      }
    })

    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault()
      closeDialog(Object.fromEntries(new FormData(event.currentTarget).entries()))
    })

    document.body.appendChild(dialog)
  })
}

const setSystemStatus = (status, message) => {
  systemStatus.classList.remove('online', 'offline', 'checking')
  systemStatus.classList.add(status)
  statusText.innerText = message
}

const checkSystemStatus = async () => {
  try {
    setSystemStatus('checking', 'Verificando sistema')
    await apiRequest('/api/health')
    setSystemStatus('online', 'Sistema activo')
  } catch (error) {
    setSystemStatus('offline', 'Sin conexion a API o base')
  }
}

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      const image = new Image()

      image.addEventListener('load', () => {
        const maxSize = 900
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
        const canvas = document.createElement('canvas')

        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        resolve(canvas.toDataURL('image/jpeg', 0.82))
      })

      image.addEventListener('error', reject)
      image.src = reader.result
    })

    reader.addEventListener('error', reject)
    reader.readAsDataURL(file)
  })
}

const setTableMessage = (container, columns, message) => {
  container.innerHTML = `
    <tr class="empty-row">
      <td colspan="${columns}">
        ${message}
      </td>
    </tr>
  `
}

const renderActionButtons = (resource, id) => {
  return `
    <div class="row-actions">
      ${resource === 'pedido'
        ? `<button class="action-btn ticket" type="button" data-action="ticket" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Ticket de pedido" aria-label="Ticket de pedido">
            &#129534;
          </button>
          <button class="action-btn status" type="button" data-action="status" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Cambiar estado" aria-label="Cambiar estado">
            &#8635;
          </button>`
        : ''}
      ${resource === 'venta'
        ? `<button class="action-btn ticket" type="button" data-action="ticket" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Reimprimir ticket" aria-label="Reimprimir ticket">
            &#128438;
          </button>`
        : ''}
      ${resource !== 'venta'
        ? `<button class="action-btn edit" type="button" data-action="edit" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Editar" aria-label="Editar">
            &#9998;
          </button>`
        : ''}
      <button class="action-btn delete" type="button" data-action="delete" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Eliminar" aria-label="Eliminar">
        &#128465;
      </button>
    </div>
  `
}

const closeCurrentModal = () => {
  modal.classList.remove('show-modal')
  modalBody.innerHTML = ''
}

const renderLowStockAlerts = (items) => {
  const lowStockItems = items.filter(item => Number(item.stock) <= 3)

  if (!lowStockItems.length) {
    stockAlerts.innerHTML = ''
    return
  }

  stockAlerts.innerHTML = `
    <div class="stock-alert">
      <strong>Stock bajo</strong>
      <span>
        ${lowStockItems.map(item => `${escapeHtml(item.nombre)} (${escapeHtml(item.stock)} ${escapeHtml(item.unidad)})`).join(' &middot; ')}
      </span>
    </div>
  `
}

const buildPedidoTicket = (pedido) => {
  const anticipo = Number(pedido.anticipo || 0)
  const saldo = Math.max(Number(pedido.total || 0) - anticipo, 0)

  return [
    'PALETERIA NOPALUCAN',
    'TICKET DE PEDIDO',
    `Pedido #${pedido.id}`,
    '',
    `Cliente: ${pedido.cliente}`,
    `Telefono: ${pedido.telefono || 'Sin telefono'}`,
    `Entrega: ${formatDateTime(pedido.fechaEntrega)}`,
    `Estado: ${pedido.estado}`,
    '',
    'Pedido:',
    pedido.detalle,
    '',
    `Total estimado: ${money(pedido.total)}`,
    `Anticipo: ${money(anticipo)}`,
    `Saldo: ${money(saldo)}`,
    `Metodo anticipo: ${pedido.metodoAnticipo || 'Sin anticipo'}`,
    '',
    'Este ticket corresponde a un pedido, no a una compra.'
  ].join('\n')
}

const buildVentaTicket = ({ id, metodoPago, items, total, tipo = 'TICKET DE COMPRA', concepto = '', createdAt = new Date().toISOString() }) => {
  return [
    'PALETERIA NOPALUCAN',
    tipo,
    id ? `Venta #${id}` : 'Venta',
    concepto ? `Concepto: ${concepto}` : '',
    `Fecha: ${formatDateTime(createdAt)}`,
    `Metodo: ${metodoPago}`,
    '',
    'Productos:',
    ...items.map(item => `${item.cantidad} x ${item.nombre} ${money(item.total)}`),
    '',
    `Total: ${money(total)}`,
    '',
    'Gracias por su compra.'
  ].filter(Boolean).join('\n')
}

const renderTicket = () => {
  if (!ticketItems.length) {
    cartItemsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Sin productos</h3>
        <p>Agrega productos al ticket</p>
      </div>
    `
  } else {
    cartItemsContainer.innerHTML = ticketItems.map(renderTicketItem).join('')
  }

  const subtotal = ticketItems.reduce((total, item) => {
    return total + getWholesalePrice(item) * item.cantidad
  }, 0)

  cartSubtotal.innerText = money(subtotal)
  cartTotal.innerText = money(subtotal)
}

const addProductToTicket = (producto) => {
  const existingItem = ticketItems.find(item => item.id === producto.id)

  if (existingItem) {
    existingItem.cantidad += 1
  } else {
    ticketItems.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio || 0),
      precioMayoreo: Number(producto.precioMayoreo || 0),
      cantidadMayoreo: Number(producto.cantidadMayoreo || 0),
      cantidad: 1
    })
  }

  renderTicket()
}

const syncTicketProducts = () => {
  ticketItems = ticketItems
    .map(item => {
      const producto = productosState.find(product => product.id === item.id)

      if (!producto) {
        return null
      }

      return {
        ...item,
        nombre: producto.nombre,
        precio: Number(producto.precio || 0),
        precioMayoreo: Number(producto.precioMayoreo || 0),
        cantidadMayoreo: Number(producto.cantidadMayoreo || 0)
      }
    })
    .filter(Boolean)

  renderTicket()
}

const renderProductos = (productos) => {
  productosState = productos
  syncTicketProducts()

  if (!productos.length) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No hay productos registrados</h3>
        <p>Agrega tu primer producto para comenzar</p>
      </div>
    `

    return
  }

  productsContainer.innerHTML = productos.map(producto => `
    <article class="product-card" data-product-id="${escapeHtml(producto.id)}">
      <div class="product-image">
        ${producto.imagen
          ? `<img src="${escapeHtml(producto.imagen)}" alt="${escapeHtml(producto.nombre)}">`
          : '<span>&#127848;</span>'}
      </div>
      <h3>${escapeHtml(producto.nombre)}</h3>
      <p>${money(producto.precio)}</p>
      ${producto.precioMayoreo && producto.cantidadMayoreo
        ? `<small>Mayoreo ${money(producto.precioMayoreo)} desde ${escapeHtml(producto.cantidadMayoreo)} pzas</small>`
        : ''}
      <span>${escapeHtml(producto.categoria)} &middot; Stock ${escapeHtml(producto.stock)}</span>
      ${renderActionButtons('producto', producto.id)}
    </article>
  `).join('')
}

const renderMateriaPrima = (items) => {
  materiaState = items
  renderLowStockAlerts(items)

  if (!items.length) {
    setTableMessage(materiaContainer, 5, 'No hay materia prima registrada')
    return
  }

  materiaContainer.innerHTML = items.map(item => `
    <tr class="${Number(item.stock) <= 3 ? 'low-stock-row' : ''}">
      <td>${escapeHtml(item.nombre)}</td>
      <td>${escapeHtml(item.stock)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${escapeHtml(item.proveedor?.nombre || 'Sin proveedor')}</td>
      <td>${renderActionButtons('materia', item.id)}</td>
    </tr>
  `).join('')
}

const renderClientes = (clientes) => {
  clientesState = clientes

  if (!clientes.length) {
    setTableMessage(clientesContainer, 3, 'No hay clientes registrados')
    return
  }

  clientesContainer.innerHTML = clientes.map(cliente => `
    <tr>
      <td>${escapeHtml(cliente.nombre)}</td>
      <td>${escapeHtml(cliente.telefono || 'Sin telefono')}</td>
      <td>${renderActionButtons('cliente', cliente.id)}</td>
    </tr>
  `).join('')
}

const renderPedidos = (pedidos) => {
  pedidosState = pedidos

  if (!pedidos.length) {
    setTableMessage(pedidosContainer, 6, 'No hay pedidos registrados')
    return
  }

  pedidosContainer.innerHTML = pedidos.map(pedido => `
    <tr>
      <td>
        <strong>${escapeHtml(pedido.cliente)}</strong>
        <small>${escapeHtml(pedido.telefono || 'Sin telefono')}</small>
      </td>
      <td>${escapeHtml(formatDateTime(pedido.fechaEntrega))}</td>
      <td>${escapeHtml(pedido.detalle)}</td>
      <td>
        ${money(pedido.total)}
        <small>Anticipo ${money(pedido.anticipo)}</small>
      </td>
      <td>
        <button class="status-pill" type="button" data-action="status" data-resource="pedido" data-id="${escapeHtml(pedido.id)}">
          ${escapeHtml(pedido.estado)}
        </button>
      </td>
      <td>${renderActionButtons('pedido', pedido.id)}</td>
    </tr>
  `).join('')
}

const renderVentas = (ventas) => {
  ventasState = ventas

  if (!ventas.length) {
    setTableMessage(ventasContainer, 5, 'No hay ventas registradas')
    return
  }

  ventasContainer.innerHTML = ventas.map(venta => `
    <tr>
      <td>${escapeHtml(formatDateTime(venta.createdAt))}</td>
      <td>
        ${escapeHtml(venta.metodoPago)}
        <small>${escapeHtml(venta.tipo || 'Venta')}</small>
      </td>
      <td>${escapeHtml(summarizeItems(venta.items))}</td>
      <td>${money(venta.total)}</td>
      <td>${renderActionButtons('venta', venta.id)}</td>
    </tr>
  `).join('')
}

const renderProveedores = (proveedores) => {
  proveedoresState = proveedores

  if (!proveedores.length) {
    setTableMessage(proveedoresContainer, 6, 'No hay proveedores registrados')
    return
  }

  proveedoresContainer.innerHTML = proveedores.map(proveedor => `
    <tr>
      <td>${escapeHtml(proveedor.nombre)}</td>
      <td>${escapeHtml(proveedor.contacto || 'Sin contacto')}</td>
      <td>${escapeHtml(proveedor.telefono || 'Sin telefono')}</td>
      <td>${escapeHtml(proveedor.descripcion || 'Sin descripcion')}</td>
      <td>${escapeHtml((proveedor.materias || []).map(item => item.nombre).join(', ') || 'Sin materia')}</td>
      <td>${renderActionButtons('proveedor', proveedor.id)}</td>
    </tr>
  `).join('')
}

const loadData = async () => {
  try {
    await checkSystemStatus()

    const [productos, materiaPrima, clientes, proveedores, pedidos, ventas] = await Promise.all([
      apiRequest('/api/productos'),
      apiRequest('/api/materia-prima'),
      apiRequest('/api/clientes'),
      apiRequest('/api/proveedores'),
      apiRequest('/api/pedidos'),
      apiRequest('/api/ventas')
    ])

    renderProductos(productos)
    renderMateriaPrima(materiaPrima)
    renderClientes(clientes)
    renderProveedores(proveedores)
    renderPedidos(pedidos)
    renderVentas(ventas)
  } catch (error) {
    setSystemStatus('offline', 'Sin conexion a API o base')

    productsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No se pudo conectar con la API</h3>
        <p>Revisa la URL en Configuracion o ejecuta la API local.</p>
      </div>
    `

    setTableMessage(materiaContainer, 5, 'No se pudo cargar la materia prima')
    setTableMessage(clientesContainer, 3, 'No se pudieron cargar los clientes')
    setTableMessage(proveedoresContainer, 6, 'No se pudieron cargar los proveedores')
    setTableMessage(pedidosContainer, 6, 'No se pudieron cargar los pedidos')
    setTableMessage(ventasContainer, 5, 'No se pudieron cargar las ventas')
  }
}

const renderApiSettings = () => {
  settingsGrid.insertAdjacentHTML('beforeend', `
    <div class="setting-card locked-setting">
      <h3><span class="card-icon">&#128279;</span> API</h3>
      <p>Configuraci&oacute;n bloqueada</p>
      <small>Archivo: ${escapeHtml(configPathState || 'Documentos/Paleteria Nopalucan POS/paleteria-pos.config')}</small>
    </div>
  `)
}

const renderProductModal = (producto = null) => {
  const isEditing = Boolean(producto)

  modalTitle.innerText = isEditing ? 'Editar Producto' : 'Nuevo Producto'
  modalBody.innerHTML = `
    <form data-resource="producto" ${isEditing ? `data-id="${escapeHtml(producto.id)}"` : ''}>
      <div class="form-group">
        <label>Nombre del producto</label>
        <input name="nombre" type="text" placeholder="Ej. Paleta Mango" value="${escapeHtml(producto?.nombre || '')}" required>
      </div>

      <div class="form-group">
        <label>Foto</label>
        <label class="image-upload">
          <input id="producto-imagen-file" type="file" accept="image/*">
          <span>Seleccionar foto</span>
        </label>
        <input id="producto-imagen" name="imagen" type="hidden" value="${escapeHtml(producto?.imagen || '')}">
        <div class="image-preview ${producto?.imagen ? 'has-image' : ''}" id="producto-imagen-preview">
          ${producto?.imagen
            ? `<img src="${escapeHtml(producto.imagen)}" alt="${escapeHtml(producto.nombre)}">`
            : '<span>Sin foto</span>'}
        </div>
      </div>

      <div class="form-group">
        <label>Precio normal</label>
        <input name="precio" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precio ?? '')}" required>
      </div>

      <div class="form-group">
        <label>Precio mayoreo</label>
        <input name="precioMayoreo" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precioMayoreo ?? '')}">
      </div>

      <div class="form-group">
        <label>Cantidad para mayoreo</label>
        <input name="cantidadMayoreo" type="number" min="1" step="1" placeholder="Ej. 10" value="${escapeHtml(producto?.cantidadMayoreo ?? '')}">
      </div>

      <div class="form-group">
        <label>Categor&iacute;a</label>
        <input name="categoria" type="text" placeholder="Ej. Paletas de agua" value="${escapeHtml(producto?.categoria || '')}" required>
      </div>

      <div class="form-group">
        <label>Stock</label>
        <input name="stock" type="number" min="0" step="1" placeholder="0" value="${escapeHtml(producto?.stock ?? 0)}">
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar producto'}</button>
    </form>
  `
}

const renderMateriaModal = (item = null) => {
  const isEditing = Boolean(item)
  const selectedProveedorId = item?.proveedorId || ''
  const proveedoresOptions = proveedoresState.map(proveedor => `
    <option value="${escapeHtml(proveedor.id)}" ${String(selectedProveedorId) === String(proveedor.id) ? 'selected' : ''}>
      ${escapeHtml(proveedor.nombre)}
    </option>
  `).join('')

  modalTitle.innerText = isEditing ? 'Editar Materia Prima' : 'Nueva Materia Prima'
  modalBody.innerHTML = `
    <form data-resource="materia" ${isEditing ? `data-id="${escapeHtml(item.id)}"` : ''}>
      <div class="form-group">
        <label>Nombre</label>
        <input name="nombre" type="text" placeholder="Ej. Leche" value="${escapeHtml(item?.nombre || '')}" required>
      </div>

      <div class="form-group">
        <label>Stock</label>
        <input name="stock" type="number" min="0" step="0.01" placeholder="0" value="${escapeHtml(item?.stock ?? '')}" required>
      </div>

      <div class="form-group">
        <label>Unidad</label>
        <select name="unidad" required>
          <option ${item?.unidad === 'Litros' ? 'selected' : ''}>Litros</option>
          <option ${item?.unidad === 'Kilos' ? 'selected' : ''}>Kilos</option>
          <option ${item?.unidad === 'Piezas' ? 'selected' : ''}>Piezas</option>
        </select>
      </div>

      <div class="form-group">
        <label>Proveedor</label>
        <select name="proveedorId">
          <option value="">Sin proveedor</option>
          ${proveedoresOptions}
        </select>
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar materia prima'}</button>
    </form>
  `
}

const renderClienteModal = (cliente = null) => {
  const isEditing = Boolean(cliente)

  modalTitle.innerText = isEditing ? 'Editar Cliente' : 'Nuevo Cliente'
  modalBody.innerHTML = `
    <form data-resource="cliente" ${isEditing ? `data-id="${escapeHtml(cliente.id)}"` : ''}>
      <div class="form-group">
        <label>Nombre</label>
        <input name="nombre" type="text" placeholder="Nombre del cliente" value="${escapeHtml(cliente?.nombre || '')}" required>
      </div>

      <div class="form-group">
        <label>Tel&eacute;fono</label>
        <input name="telefono" type="text" placeholder="2481234567" value="${escapeHtml(cliente?.telefono || '')}">
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar cliente'}</button>
    </form>
  `
}

const renderPedidoModal = (pedido = null) => {
  const isEditing = Boolean(pedido)
  const clienteOptions = clientesState.map(cliente => `
    <option value="${escapeHtml(cliente.id)}" data-nombre="${escapeHtml(cliente.nombre)}" data-telefono="${escapeHtml(cliente.telefono || '')}" ${cliente.nombre === pedido?.cliente ? 'selected' : ''}>
      ${escapeHtml(cliente.nombre)}
    </option>
  `).join('')
  const anticipo = Number(pedido?.anticipo || 0)
  const saldo = Math.max(Number(pedido?.total || 0) - anticipo, 0)

  modalTitle.innerText = isEditing ? 'Editar Pedido' : 'Nuevo Pedido'
  modalBody.innerHTML = `
    <form data-resource="pedido" ${isEditing ? `data-id="${escapeHtml(pedido.id)}"` : ''}>
      <div class="form-group">
        <label>Cliente registrado</label>
        <select id="pedido-cliente-select">
          <option value="">Seleccionar cliente</option>
          ${clienteOptions}
        </select>
      </div>

      <div class="form-group">
        <label>Cliente</label>
        <input id="pedido-cliente" name="cliente" type="text" placeholder="Nombre del cliente" value="${escapeHtml(pedido?.cliente || '')}" required>
      </div>

      <div class="form-group">
        <label>Tel&eacute;fono</label>
        <input id="pedido-telefono" name="telefono" type="text" placeholder="2481234567" value="${escapeHtml(pedido?.telefono || '')}">
      </div>

      <div class="form-group">
        <label>Pedido</label>
        <textarea name="detalle" placeholder="Ej. 20 paletas de mango para evento" required>${escapeHtml(pedido?.detalle || '')}</textarea>
      </div>

      <div class="form-group">
        <label>Fecha de entrega</label>
        <input name="fechaEntrega" type="datetime-local" value="${escapeHtml(toDatetimeLocalValue(pedido?.fechaEntrega))}" required>
      </div>

      <div class="form-group">
        <label>Total estimado</label>
        <input id="pedido-total" name="total" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(pedido?.total ?? 0)}">
      </div>

      <div class="form-group">
        <label>Anticipo</label>
        <input id="pedido-anticipo" name="anticipo" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(pedido?.anticipo ?? 0)}">
      </div>

      <div class="form-group">
        <label>M&eacute;todo del anticipo</label>
        <select name="metodoAnticipo">
          <option value="">Sin anticipo</option>
          <option ${pedido?.metodoAnticipo === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
          <option ${pedido?.metodoAnticipo === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
        </select>
      </div>

      <div class="form-group">
        <label>M&eacute;todo al entregar</label>
        <select name="metodoEntrega">
          <option>Efectivo</option>
          <option>Tarjeta</option>
        </select>
      </div>

      <div class="form-summary">
        Saldo pendiente: <strong id="pedido-saldo">${money(saldo)}</strong>
      </div>

      <div class="form-group">
        <label>Estado</label>
        <select name="estado" required>
          <option ${!pedido || pedido?.estado === 'En preparación' || pedido?.estado === 'En preparacion' || pedido?.estado === 'Pendiente' ? 'selected' : ''}>En preparación</option>
          <option ${pedido?.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
          <option ${pedido?.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar pedido'}</button>
    </form>
  `
}

const renderProveedorModal = (proveedor = null) => {
  const isEditing = Boolean(proveedor)

  modalTitle.innerText = isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'
  modalBody.innerHTML = `
    <form data-resource="proveedor" ${isEditing ? `data-id="${escapeHtml(proveedor.id)}"` : ''}>
      <div class="form-group">
        <label>Proveedor</label>
        <input name="nombre" type="text" placeholder="Nombre proveedor" value="${escapeHtml(proveedor?.nombre || '')}" required>
      </div>

      <div class="form-group">
        <label>Contacto</label>
        <input name="contacto" type="text" placeholder="Nombre contacto" value="${escapeHtml(proveedor?.contacto || '')}">
      </div>

      <div class="form-group">
        <label>Tel&eacute;fono</label>
        <input name="telefono" type="text" placeholder="2221234567" value="${escapeHtml(proveedor?.telefono || '')}">
      </div>

      <div class="form-group">
        <label>Descripci&oacute;n</label>
        <textarea name="descripcion" placeholder="Ej. Proveedor de leche, azucar y empaques">${escapeHtml(proveedor?.descripcion || '')}</textarea>
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar proveedor'}</button>
    </form>
  `
}

const openModal = (type, record = null) => {
  modal.classList.add('show-modal')

  if (type === 'producto') {
    renderProductModal(record)
  }

  if (type === 'materia') {
    renderMateriaModal(record)
  }

  if (type === 'cliente') {
    renderClienteModal(record)
  }

  if (type === 'pedido') {
    renderPedidoModal(record)
  }

  if (type === 'proveedor') {
    renderProveedorModal(record)
  }
}

buttons.forEach(button => {
  button.addEventListener('click', () => {
    buttons.forEach(btn => {
      btn.classList.remove('active')
    })

    button.classList.add('active')

    sections.forEach(section => {
      section.classList.remove('active-section')
    })

    document
      .getElementById(button.dataset.section)
      .classList.add('active-section')
  })
})

document.querySelectorAll('.add-btn').forEach(button => {
  button.addEventListener('click', () => {
    openModal(button.dataset.type)
  })
})

themeToggle.addEventListener('click', () => {
  applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark')
})

const handleActionClick = async (event) => {
  const actionButton = event.target.closest('[data-action]')

  if (!actionButton) {
    return
  }

  const config = resourceConfig[actionButton.dataset.resource]
  const record = config?.state().find(item => String(item.id) === actionButton.dataset.id)

  if (!config || !record) {
    return
  }

  if (actionButton.dataset.action === 'ticket' && actionButton.dataset.resource === 'pedido') {
    await showTicketDialog('Ticket de pedido', buildPedidoTicket(record))
    return
  }

  if (actionButton.dataset.action === 'ticket' && actionButton.dataset.resource === 'venta') {
    await showTicketDialog('Ticket de venta', record.ticket || buildVentaTicket(record))
    return
  }

  if (actionButton.dataset.action === 'status' && actionButton.dataset.resource === 'pedido') {
    const statusData = await showPedidoStatusDialog(record)

    if (!statusData) {
      return
    }

    const updatedPedido = await apiRequest(`${config.path}/${record.id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    })

    await loadData()
    await showTicketDialog('Ticket de pedido', buildPedidoTicket(updatedPedido))
    return
  }

  if (actionButton.dataset.action === 'edit' && config.open) {
    config.open(record)
    return
  }

  if (actionButton.dataset.action === 'delete') {
    const recordName = record.nombre || record.cliente || record.concepto || `#${record.id}`
    const shouldDelete = await showAppDialog({
      title: 'Eliminar registro',
      message: `Eliminar ${config.label} "${recordName}"?`,
      confirmText: 'Eliminar',
      danger: true
    })

    if (!shouldDelete) {
      return
    }

    await apiRequest(`${config.path}/${record.id}`, {
      method: 'DELETE'
    })

    loadData()
  }
}

productsContainer.addEventListener('click', handleActionClick)
materiaContainer.addEventListener('click', handleActionClick)
clientesContainer.addEventListener('click', handleActionClick)
pedidosContainer.addEventListener('click', handleActionClick)
ventasContainer.addEventListener('click', handleActionClick)
proveedoresContainer.addEventListener('click', handleActionClick)

productsContainer.addEventListener('click', (event) => {
  if (event.target.closest('[data-action]')) {
    return
  }

  const productCard = event.target.closest('[data-product-id]')

  if (!productCard) {
    return
  }

  const producto = productosState.find(item => String(item.id) === productCard.dataset.productId)

  if (producto) {
    addProductToTicket(producto)
  }
})

cartItemsContainer.addEventListener('click', (event) => {
  const button = event.target.closest('[data-ticket-action]')

  if (!button || button.dataset.ticketAction === 'quantity') {
    return
  }

  const item = ticketItems.find(ticketItem => String(ticketItem.id) === button.dataset.id)

  if (!item) {
    return
  }

  if (button.dataset.ticketAction === 'increase') {
    item.cantidad += 1
  }

  if (button.dataset.ticketAction === 'decrease') {
    item.cantidad -= 1
  }

  if (button.dataset.ticketAction === 'remove' || item.cantidad <= 0) {
    ticketItems = ticketItems.filter(ticketItem => ticketItem.id !== item.id)
  }

  renderTicket()
})

cartItemsContainer.addEventListener('input', (event) => {
  if (event.target.dataset.ticketAction !== 'quantity') {
    return
  }

  const item = ticketItems.find(ticketItem => String(ticketItem.id) === event.target.dataset.id)

  if (!item) {
    return
  }

  item.cantidad = Math.max(1, Math.floor(Number(event.target.value) || 1))
  renderTicket()
})

chargeTicket.addEventListener('click', async () => {
  if (!ticketItems.length) {
    await showAppDialog({
      title: 'Ticket vacio',
      message: 'Agrega productos al ticket antes de cobrar.',
      confirmText: 'Entendido',
      showCancel: false
    })
    return
  }

  const metodoPago = ticketPaymentMethod.value
  const items = getTicketItems()
  const total = getTicketTotal()
  const ticket = buildVentaTicket({
    metodoPago,
    items,
    total,
    tipo: 'TICKET DE COMPRA',
    concepto: 'Venta de mostrador'
  })
  const venta = await apiRequest('/api/ventas', {
    method: 'POST',
    body: JSON.stringify({
      total,
      metodoPago,
      tipo: 'Venta',
      concepto: 'Venta de mostrador',
      items,
      ticket
    })
  })

  await showTicketDialog('Ticket de compra', venta.ticket || ticket)

  ticketItems = []
  renderTicket()
  loadData()
})

cancelTicket.addEventListener('click', async () => {
  if (!ticketItems.length) {
    return
  }

  const shouldCancel = await showAppDialog({
    title: 'Cancelar ticket',
    message: 'Limpiar el ticket actual?',
    confirmText: 'Limpiar',
    cancelText: 'Volver'
  })

  if (!shouldCancel) {
    return
  }

  ticketItems = []
  renderTicket()
})

modalBody.addEventListener('change', async (event) => {
  if (event.target.id === 'pedido-cliente-select') {
    const selectedOption = event.target.selectedOptions[0]
    const clienteInput = document.getElementById('pedido-cliente')
    const telefonoInput = document.getElementById('pedido-telefono')

    if (selectedOption?.value && clienteInput && telefonoInput) {
      clienteInput.value = selectedOption.dataset.nombre || ''
      telefonoInput.value = selectedOption.dataset.telefono || ''
    }

    return
  }

  if (event.target.id !== 'producto-imagen-file') {
    return
  }

  const [file] = event.target.files

  if (!file) {
    return
  }

  const dataUrl = await fileToDataUrl(file)
  const imageInput = document.getElementById('producto-imagen')
  const preview = document.getElementById('producto-imagen-preview')

  imageInput.value = dataUrl
  preview.classList.add('has-image')
  preview.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Vista previa del producto">`
})

modalBody.addEventListener('input', (event) => {
  if (!['pedido-total', 'pedido-anticipo'].includes(event.target.id)) {
    return
  }

  const totalInput = document.getElementById('pedido-total')
  const anticipoInput = document.getElementById('pedido-anticipo')
  const saldo = document.getElementById('pedido-saldo')

  if (!totalInput || !anticipoInput || !saldo) {
    return
  }

  saldo.innerText = money(Math.max(Number(totalInput.value || 0) - Number(anticipoInput.value || 0), 0))
})

modalBody.addEventListener('submit', async (event) => {
  event.preventDefault()

  const form = event.target
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  const resource = form.dataset.resource
  const isEditing = Boolean(form.dataset.id)
  const config = resourceConfig[resource]

  const savedRecord = await apiRequest(isEditing ? `${config.path}/${form.dataset.id}` : config.path, {
    method: isEditing ? 'PUT' : 'POST',
    body: JSON.stringify(data)
  })

  closeCurrentModal()
  await loadData()

  if (resource === 'pedido') {
    await showTicketDialog('Ticket de pedido', buildPedidoTicket(savedRecord))
  }
})

closeModal.addEventListener('click', closeCurrentModal)

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeCurrentModal()
  }
})

const boot = async () => {
  applyTheme(localStorage.getItem('theme') || 'light')
  await initConfig()
  renderApiSettings()
  loadData()
}

boot()
