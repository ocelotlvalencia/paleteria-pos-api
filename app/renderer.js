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

const DEFAULT_API_URL = 'http://localhost:3000'

const getApiUrl = () => {
  return (localStorage.getItem('apiUrl') || DEFAULT_API_URL).replace(/\/$/, '')
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

const setTableMessage = (container, columns, message) => {
  container.innerHTML = `
    <tr class="empty-row">
      <td colspan="${columns}">
        ${message}
      </td>
    </tr>
  `
}

const closeCurrentModal = () => {
  modal.classList.remove('show-modal')
  modalBody.innerHTML = ''
}

const renderProductos = (productos) => {
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
    <article class="product-card">
      <h3>${escapeHtml(producto.nombre)}</h3>
      <p>${money(producto.precio)}</p>
      <span>${escapeHtml(producto.categoria)} · Stock ${escapeHtml(producto.stock)}</span>
    </article>
  `).join('')
}

const renderMateriaPrima = (items) => {
  if (!items.length) {
    setTableMessage(materiaContainer, 3, 'No hay materia prima registrada')
    return
  }

  materiaContainer.innerHTML = items.map(item => `
    <tr>
      <td>${escapeHtml(item.nombre)}</td>
      <td>${escapeHtml(item.stock)}</td>
      <td>${escapeHtml(item.unidad)}</td>
    </tr>
  `).join('')
}

const renderClientes = (clientes) => {
  if (!clientes.length) {
    setTableMessage(clientesContainer, 3, 'No hay clientes registrados')
    return
  }

  clientesContainer.innerHTML = clientes.map(cliente => `
    <tr>
      <td>${escapeHtml(cliente.nombre)}</td>
      <td>${escapeHtml(cliente.telefono || 'Sin telefono')}</td>
      <td>${escapeHtml(cliente.puntos)}</td>
    </tr>
  `).join('')
}

const renderProveedores = (proveedores) => {
  if (!proveedores.length) {
    setTableMessage(proveedoresContainer, 3, 'No hay proveedores registrados')
    return
  }

  proveedoresContainer.innerHTML = proveedores.map(proveedor => `
    <tr>
      <td>${escapeHtml(proveedor.nombre)}</td>
      <td>${escapeHtml(proveedor.contacto || 'Sin contacto')}</td>
      <td>${escapeHtml(proveedor.telefono || 'Sin telefono')}</td>
    </tr>
  `).join('')
}

const loadData = async () => {
  try {
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
    productsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No se pudo conectar con la API</h3>
        <p>Revisa la URL en Configuracion o ejecuta la API local.</p>
      </div>
    `

    setTableMessage(materiaContainer, 3, 'No se pudo cargar la materia prima')
    setTableMessage(clientesContainer, 3, 'No se pudieron cargar los clientes')
    setTableMessage(proveedoresContainer, 3, 'No se pudieron cargar los proveedores')
  }
}

const renderApiSettings = () => {
  settingsGrid.insertAdjacentHTML('beforeend', `
    <div class="setting-card">
      <h3>API</h3>
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

const openModal = (type) => {
  modal.classList.add('show-modal')

  if (type === 'producto') {
    modalTitle.innerText = 'Nuevo Producto'
    modalBody.innerHTML = `
      <form data-resource="producto">
        <div class="form-group">
          <label>Nombre del producto</label>
          <input name="nombre" type="text" placeholder="Ej. Paleta Mango" required>
        </div>

        <div class="form-group">
          <label>Precio</label>
          <input name="precio" type="number" min="0" step="0.01" placeholder="$0.00" required>
        </div>

        <div class="form-group">
          <label>Categor&iacute;a</label>
          <select name="categoria" required>
            <option>Paletas</option>
            <option>Helados</option>
            <option>Snacks</option>
          </select>
        </div>

        <div class="form-group">
          <label>Stock</label>
          <input name="stock" type="number" min="0" step="1" placeholder="0" value="0">
        </div>

        <button class="save-btn" type="submit">Guardar producto</button>
      </form>
    `
  }

  if (type === 'materia') {
    modalTitle.innerText = 'Nueva Materia Prima'
    modalBody.innerHTML = `
      <form data-resource="materia">
        <div class="form-group">
          <label>Nombre</label>
          <input name="nombre" type="text" placeholder="Ej. Leche" required>
        </div>

        <div class="form-group">
          <label>Stock</label>
          <input name="stock" type="number" min="0" step="0.01" placeholder="0" required>
        </div>

        <div class="form-group">
          <label>Unidad</label>
          <select name="unidad" required>
            <option>Litros</option>
            <option>Kilos</option>
            <option>Piezas</option>
          </select>
        </div>

        <button class="save-btn" type="submit">Guardar materia prima</button>
      </form>
    `
  }

  if (type === 'cliente') {
    modalTitle.innerText = 'Nuevo Cliente'
    modalBody.innerHTML = `
      <form data-resource="cliente">
        <div class="form-group">
          <label>Nombre</label>
          <input name="nombre" type="text" placeholder="Nombre del cliente" required>
        </div>

        <div class="form-group">
          <label>Tel&eacute;fono</label>
          <input name="telefono" type="text" placeholder="2481234567">
        </div>

        <button class="save-btn" type="submit">Guardar cliente</button>
      </form>
    `
  }

  if (type === 'proveedor') {
    modalTitle.innerText = 'Nuevo Proveedor'
    modalBody.innerHTML = `
      <form data-resource="proveedor">
        <div class="form-group">
          <label>Proveedor</label>
          <input name="nombre" type="text" placeholder="Nombre proveedor" required>
        </div>

        <div class="form-group">
          <label>Contacto</label>
          <input name="contacto" type="text" placeholder="Nombre contacto">
        </div>

        <div class="form-group">
          <label>Tel&eacute;fono</label>
          <input name="telefono" type="text" placeholder="2221234567">
        </div>

        <button class="save-btn" type="submit">Guardar proveedor</button>
      </form>
    `
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

modalBody.addEventListener('submit', async (event) => {
  event.preventDefault()

  const form = event.target
  const formData = new FormData(form)
  const data = Object.fromEntries(formData.entries())
  const resource = form.dataset.resource

  const paths = {
    producto: '/api/productos',
    materia: '/api/materia-prima',
    cliente: '/api/clientes',
    proveedor: '/api/proveedores'
  }

  await apiRequest(paths[resource], {
    method: 'POST',
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
