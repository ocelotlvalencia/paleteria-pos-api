const buttons = document.querySelectorAll('.category')
const sections = document.querySelectorAll('.section')

const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')
const closeModal = document.getElementById('close-modal')

const productsContainer = document.getElementById('products-container')
const materiaContainer = document.getElementById('materia-container')
const clientesContainer = document.getElementById('clientes-container')
const proveedoresContainer = document.getElementById('proveedores-container')
const settingsGrid = document.querySelector('#configuracion .settings-grid')
const systemStatus = document.getElementById('system-status')
const statusText = document.getElementById('status-text')
const cartItemsContainer = document.getElementById('cart-items')
const cartSubtotal = document.getElementById('cart-subtotal')
const cartTotal = document.getElementById('cart-total')
const payButtons = document.querySelectorAll('.pay-btn')

let productosState = []
let materiaState = []
let clientesState = []
let proveedoresState = []
let ticketItems = []

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
  proveedor: {
    path: '/api/proveedores',
    label: 'proveedor',
    state: () => proveedoresState,
    open: (record) => openModal('proveedor', record)
  }
}

const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'
const LEGACY_LOCAL_API_URLS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])

const getApiUrl = () => {
  const storedUrl = (localStorage.getItem('apiUrl') || '').replace(/\/$/, '')

  if (!storedUrl || LEGACY_LOCAL_API_URLS.has(storedUrl)) {
    localStorage.setItem('apiUrl', DEFAULT_API_URL)
    return DEFAULT_API_URL
  }

  return storedUrl
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
      <button class="action-btn edit" type="button" data-action="edit" data-resource="${resource}" data-id="${escapeHtml(id)}">
        Editar
      </button>
      <button class="action-btn delete" type="button" data-action="delete" data-resource="${resource}" data-id="${escapeHtml(id)}">
        Eliminar
      </button>
    </div>
  `
}

const closeCurrentModal = () => {
  modal.classList.remove('show-modal')
  modalBody.innerHTML = ''
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
    cartItemsContainer.innerHTML = ticketItems.map(item => `
      <article class="cart-item" data-ticket-id="${escapeHtml(item.id)}">
        <div class="cart-item-info">
          <h4>${escapeHtml(item.nombre)}</h4>
          <p>${money(item.precio)} c/u</p>
        </div>

        <div class="quantity-control">
          <button type="button" data-ticket-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
          <input type="number" min="1" step="1" value="${escapeHtml(item.cantidad)}" data-ticket-action="quantity" data-id="${escapeHtml(item.id)}">
          <button type="button" data-ticket-action="increase" data-id="${escapeHtml(item.id)}">+</button>
        </div>

        <strong>${money(item.precio * item.cantidad)}</strong>
        <button class="remove-ticket-item" type="button" data-ticket-action="remove" data-id="${escapeHtml(item.id)}">&times;</button>
      </article>
    `).join('')
  }

  const subtotal = ticketItems.reduce((total, item) => {
    return total + item.precio * item.cantidad
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
        precio: Number(producto.precio || 0)
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
      <span>${escapeHtml(producto.categoria)} &middot; Stock ${escapeHtml(producto.stock)}</span>
      ${renderActionButtons('producto', producto.id)}
    </article>
  `).join('')
}

const renderMateriaPrima = (items) => {
  materiaState = items

  if (!items.length) {
    setTableMessage(materiaContainer, 4, 'No hay materia prima registrada')
    return
  }

  materiaContainer.innerHTML = items.map(item => `
    <tr>
      <td>${escapeHtml(item.nombre)}</td>
      <td>${escapeHtml(item.stock)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${renderActionButtons('materia', item.id)}</td>
    </tr>
  `).join('')
}

const renderClientes = (clientes) => {
  clientesState = clientes

  if (!clientes.length) {
    setTableMessage(clientesContainer, 4, 'No hay clientes registrados')
    return
  }

  clientesContainer.innerHTML = clientes.map(cliente => `
    <tr>
      <td>${escapeHtml(cliente.nombre)}</td>
      <td>${escapeHtml(cliente.telefono || 'Sin telefono')}</td>
      <td>${escapeHtml(cliente.puntos)}</td>
      <td>${renderActionButtons('cliente', cliente.id)}</td>
    </tr>
  `).join('')
}

const renderProveedores = (proveedores) => {
  proveedoresState = proveedores

  if (!proveedores.length) {
    setTableMessage(proveedoresContainer, 4, 'No hay proveedores registrados')
    return
  }

  proveedoresContainer.innerHTML = proveedores.map(proveedor => `
    <tr>
      <td>${escapeHtml(proveedor.nombre)}</td>
      <td>${escapeHtml(proveedor.contacto || 'Sin contacto')}</td>
      <td>${escapeHtml(proveedor.telefono || 'Sin telefono')}</td>
      <td>${renderActionButtons('proveedor', proveedor.id)}</td>
    </tr>
  `).join('')
}

const loadData = async () => {
  try {
    await checkSystemStatus()

    const [productos, materiaPrima, clientes, proveedores] = await Promise.all([
      apiRequest('/api/productos'),
      apiRequest('/api/materia-prima'),
      apiRequest('/api/clientes'),
      apiRequest('/api/proveedores')
    ])

    renderProductos(productos)
    renderMateriaPrima(materiaPrima)
    renderClientes(clientes)
    renderProveedores(proveedores)
  } catch (error) {
    setSystemStatus('offline', 'Sin conexion a API o base')

    productsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No se pudo conectar con la API</h3>
        <p>Revisa la URL en Configuracion o ejecuta la API local.</p>
      </div>
    `

    setTableMessage(materiaContainer, 4, 'No se pudo cargar la materia prima')
    setTableMessage(clientesContainer, 4, 'No se pudieron cargar los clientes')
    setTableMessage(proveedoresContainer, 4, 'No se pudieron cargar los proveedores')
  }
}

const renderApiSettings = () => {
  settingsGrid.insertAdjacentHTML('beforeend', `
    <div class="setting-card">
      <h3><span class="card-icon">&#128279;</span> API</h3>
      <p>URL actual</p>
      <form id="api-settings-form" class="api-settings-form">
        <input
          type="url"
          name="apiUrl"
          value="${escapeHtml(getApiUrl())}"
          placeholder="https://tu-api.vercel.app"
          required
        >
        <button class="save-btn" type="submit">
          Guardar API
        </button>
      </form>
    </div>
  `)

  document.getElementById('api-settings-form').addEventListener('submit', (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    localStorage.setItem('apiUrl', formData.get('apiUrl').trim())

    loadData()
  })
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
        <label>Precio</label>
        <input name="precio" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precio ?? '')}" required>
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

      <div class="form-group">
        <label>Puntos</label>
        <input name="puntos" type="number" min="0" step="1" placeholder="0" value="${escapeHtml(cliente?.puntos ?? 0)}">
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar cliente'}</button>
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

  if (actionButton.dataset.action === 'edit') {
    config.open(record)
    return
  }

  if (actionButton.dataset.action === 'delete') {
    const shouldDelete = window.confirm(`Eliminar ${config.label} "${record.nombre}"?`)

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

payButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (!ticketItems.length) {
      window.alert('Agrega productos al ticket antes de cobrar.')
      return
    }

    const total = ticketItems.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
    const shouldClearTicket = window.confirm(`Cobrar ${money(total)} y limpiar el ticket?`)

    if (!shouldClearTicket) {
      return
    }

    ticketItems = []
    renderTicket()
  })
})

modalBody.addEventListener('change', async (event) => {
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

modalBody.addEventListener('submit', async (event) => {
  event.preventDefault()

  const form = event.target
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  const resource = form.dataset.resource
  const isEditing = Boolean(form.dataset.id)
  const config = resourceConfig[resource]

  await apiRequest(isEditing ? `${config.path}/${form.dataset.id}` : config.path, {
    method: isEditing ? 'PUT' : 'POST',
    body: JSON.stringify(data)
  })

  closeCurrentModal()
  loadData()
})

closeModal.addEventListener('click', closeCurrentModal)

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeCurrentModal()
  }
})

renderApiSettings()
loadData()
