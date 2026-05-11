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

let productosState = []

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

const closeCurrentModal = () => {
  modal.classList.remove('show-modal')
  modalBody.innerHTML = ''
}

const renderProductos = (productos) => {
  productosState = productos

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
      <div class="product-image">
        ${producto.imagen
          ? `<img src="${escapeHtml(producto.imagen)}" alt="${escapeHtml(producto.nombre)}">`
          : '<span>&#127848;</span>'}
      </div>
      <h3>${escapeHtml(producto.nombre)}</h3>
      <p>${money(producto.precio)}</p>
      <span>${escapeHtml(producto.categoria)} &middot; Stock ${escapeHtml(producto.stock)}</span>
      <button class="edit-product-btn" type="button" data-product-id="${escapeHtml(producto.id)}">
        Editar
      </button>
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
        <input name="precio" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precio || '')}" required>
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

const openModal = (type, record = null) => {
  modal.classList.add('show-modal')

  if (type === 'producto') {
    renderProductModal(record)
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

productsContainer.addEventListener('click', (event) => {
  const editButton = event.target.closest('.edit-product-btn')

  if (!editButton) {
    return
  }

  const producto = productosState.find(item => String(item.id) === editButton.dataset.productId)

  if (producto) {
    openModal('producto', producto)
  }
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
  const isEditingProduct = resource === 'producto' && form.dataset.id

  const paths = {
    producto: '/api/productos',
    materia: '/api/materia-prima',
    cliente: '/api/clientes',
    proveedor: '/api/proveedores'
  }

  await apiRequest(isEditingProduct ? `${paths[resource]}/${form.dataset.id}` : paths[resource], {
    method: isEditingProduct ? 'PUT' : 'POST',
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
