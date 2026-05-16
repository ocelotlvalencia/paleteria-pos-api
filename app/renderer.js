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
const gastosContainer = document.getElementById('gastos-container')
const proveedoresContainer = document.getElementById('proveedores-container')
const cashTotalSales = document.getElementById('cash-total-sales')
const cashTotalExpenses = document.getElementById('cash-total-expenses')
const cashBalance = document.getElementById('cash-balance')
const monthlyCashReport = document.getElementById('monthly-cash-report')
const stockAlerts = document.getElementById('stock-alerts')
const settingsGrid = document.getElementById('connection-settings-grid')
const systemStatus = document.getElementById('system-status')
const statusText = document.getElementById('status-text')
const cartItemsContainer = document.getElementById('cart-items')
const cartTotal = document.getElementById('cart-total')
const ticketNumber = document.getElementById('ticket-number')
const ticketClientSelect = document.getElementById('ticket-client-select')
const ticketClientName = document.getElementById('ticket-client-name')
const ticketClientPhone = document.getElementById('ticket-client-phone')
const ticketPaymentMethod = document.getElementById('ticket-payment-method')
const chargeTicket = document.getElementById('charge-ticket')
const cancelTicket = document.getElementById('cancel-ticket')
const themeToggle = document.getElementById('theme-toggle')

const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'
const LEGACY_LOCAL_API_URLS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])
const DEFAULT_OPERATION_SETTINGS = {
  printer: {
    deliveryMode: 'digital',
    name: '',
    ticketWidth: '80',
    copies: '1',
    autoPrint: false,
    header: 'PALETERIA NOPALUCAN',
    footer: 'Gracias por su compra.',
    logo: ''
  },
  payments: {
    methods: ['Efectivo', 'Tarjeta'],
    defaultMethod: 'Efectivo',
    cardFeePercent: '0',
    allowMixed: false
  }
}

let productosState = []
let materiaState = []
let clientesState = []
let pedidosState = []
let ventasState = []
let gastosState = []
let proveedoresState = []
let ticketItems = []
let apiUrlState = DEFAULT_API_URL
let configPathState = ''
let operationSettingsState = JSON.parse(JSON.stringify(DEFAULT_OPERATION_SETTINGS))

const applyTheme = async (theme, options = {}) => {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light'

  document.body.classList.toggle('dark-mode', normalizedTheme === 'dark')
  localStorage.setItem('theme', normalizedTheme)

  if (options.persist !== false && window.appConfig?.setTheme) {
    await window.appConfig.setTheme(normalizedTheme)
  }
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
  gasto: {
    path: '/api/gastos',
    label: 'gasto',
    state: () => gastosState,
    open: (record) => openModal('gasto', record)
  },
  proveedor: {
    path: '/api/proveedores',
    label: 'proveedor',
    state: () => proveedoresState,
    open: (record) => openModal('proveedor', record)
  }
}

const mergeOperationSettings = (settings = {}) => {
  const methods = Array.isArray(settings.payments?.methods) && settings.payments.methods.length
    ? settings.payments.methods
    : DEFAULT_OPERATION_SETTINGS.payments.methods

  return {
    printer: {
      ...DEFAULT_OPERATION_SETTINGS.printer,
      ...(settings.printer || {})
    },
    payments: {
      ...DEFAULT_OPERATION_SETTINGS.payments,
      ...(settings.payments || {}),
      methods
    }
  }
}

const saveOperationSettings = async (settings) => {
  operationSettingsState = mergeOperationSettings(settings)

  if (window.appConfig?.setOperationSettings) {
    operationSettingsState = mergeOperationSettings(await window.appConfig.setOperationSettings(operationSettingsState))
  }

  renderPaymentMethods()
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

  if (window.appConfig.getOperationSettings) {
    operationSettingsState = mergeOperationSettings(await window.appConfig.getOperationSettings())
  }
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

const closeCustomSelects = (except = null) => {
  document.querySelectorAll('.custom-select.open').forEach(select => {
    if (select !== except) {
      select.classList.remove('open')
    }
  })
}

const enhanceCustomSelects = (root = document) => {
  root.querySelectorAll('select:not([data-enhanced-select]):not([data-native-select])').forEach(select => {
    const wrapper = document.createElement('div')
    const button = document.createElement('button')
    const value = document.createElement('span')
    const menu = document.createElement('div')

    select.dataset.enhancedSelect = 'true'
    select.classList.add('native-select-hidden')

    wrapper.className = 'custom-select'
    button.className = 'custom-select-button'
    button.type = 'button'
    value.className = 'custom-select-value'
    menu.className = 'custom-select-menu'

    button.append(value)
    button.insertAdjacentHTML('beforeend', '<span class="custom-select-arrow"></span>')

    const syncValue = () => {
      value.textContent = select.selectedOptions[0]?.textContent.trim() || 'Seleccionar'

      menu.querySelectorAll('.custom-select-option').forEach(optionButton => {
        optionButton.classList.toggle('selected', optionButton.dataset.value === select.value)
      })
    }

    Array.from(select.options).forEach(option => {
      const optionButton = document.createElement('button')

      optionButton.className = 'custom-select-option'
      optionButton.type = 'button'
      optionButton.dataset.value = option.value
      optionButton.textContent = option.textContent.trim()

      optionButton.addEventListener('click', () => {
        select.value = option.value
        syncValue()
        wrapper.classList.remove('open')
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })

      menu.append(optionButton)
    })

    button.addEventListener('click', (event) => {
      event.stopPropagation()
      const shouldOpen = !wrapper.classList.contains('open')

      closeCustomSelects(wrapper)
      wrapper.classList.toggle('open', shouldOpen)
    })

    select.addEventListener('change', syncValue)

    wrapper.append(button, menu)
    select.after(wrapper)
    syncValue()
  })
}

const refreshCustomSelect = (select) => {
  if (!select?.dataset.enhancedSelect) {
    enhanceCustomSelects(select?.parentElement || document)
    return
  }

  const wrapper = select.nextElementSibling

  if (wrapper?.classList.contains('custom-select')) {
    wrapper.remove()
  }

  delete select.dataset.enhancedSelect
  select.classList.remove('native-select-hidden')
  enhanceCustomSelects(select.parentElement || document)
}

const money = (value) => {
  return `$${Number(value || 0).toFixed(2)}`
}

const formatTicketNumber = (value) => {
  const ticketId = Math.max(0, Math.floor(Number(value) || 0))

  return `#${String(ticketId).padStart(4, '0')}`
}

const preventFocusedNumberInputWheel = (event) => {
  if (event.target === document.activeElement && event.target.matches('input[type="number"]')) {
    event.preventDefault()
  }
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

const getMonthKey = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha'
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const formatMonthLabel = (monthKey) => {
  if (monthKey === 'Sin fecha') {
    return monthKey
  }

  const [year, month] = monthKey.split('-').map(Number)

  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1))
}

const getMonthlyCashRows = () => {
  const rows = new Map()

  const ensureRow = (monthKey) => {
    if (!rows.has(monthKey)) {
      rows.set(monthKey, {
        monthKey,
        ventas: 0,
        gastos: 0,
        ventasCount: 0,
        gastosCount: 0
      })
    }

    return rows.get(monthKey)
  }

  ventasState.forEach(venta => {
    const row = ensureRow(getMonthKey(venta.createdAt))

    row.ventas += Number(venta.total || 0)
    row.ventasCount += 1
  })

  gastosState.forEach(gasto => {
    const row = ensureRow(getMonthKey(gasto.createdAt))

    row.gastos += Number(gasto.monto || 0)
    row.gastosCount += 1
  })

  return Array.from(rows.values())
    .sort((first, second) => second.monthKey.localeCompare(first.monthKey))
}

const showMonthlyCashReport = () => {
  const rows = getMonthlyCashRows()
  const dialog = document.createElement('div')

  dialog.className = 'app-dialog show-modal'
  dialog.innerHTML = `
    <div class="app-dialog-content monthly-report-dialog">
      <h2>Resumen mensual</h2>
      <p>Ventas y gastos registrados por mes.</p>
      <div class="monthly-report-table">
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Ventas</th>
              <th>Gastos</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length
              ? rows.map(row => `
                  <tr>
                    <td>
                      <strong>${escapeHtml(formatMonthLabel(row.monthKey))}</strong>
                      <small>${escapeHtml(row.ventasCount)} ventas &middot; ${escapeHtml(row.gastosCount)} gastos</small>
                    </td>
                    <td>${money(row.ventas)}</td>
                    <td>${money(row.gastos)}</td>
                    <td><strong>${money(row.ventas - row.gastos)}</strong></td>
                  </tr>
                `).join('')
              : '<tr class="empty-row"><td colspan="4">No hay informacion registrada</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="app-dialog-actions">
        <button class="dialog-btn primary" type="button" data-dialog-action="close">Cerrar</button>
      </div>
    </div>
  `

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-dialog-action="close"]')) {
      dialog.remove()
    }
  })

  document.body.appendChild(dialog)
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

const getPaymentFee = (subtotal, method = ticketPaymentMethod?.value) => {
  const percent = Number(operationSettingsState.payments.cardFeePercent || 0)

  if (String(method || '').toLowerCase() !== 'tarjeta' || percent <= 0) {
    return 0
  }

  return subtotal * (percent / 100)
}

const getTicketChargeTotal = (method = ticketPaymentMethod?.value) => {
  const subtotal = getTicketTotal()

  return subtotal + getPaymentFee(subtotal, method)
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

const renderPaymentMethods = () => {
  if (!ticketPaymentMethod) {
    return
  }

  const methods = operationSettingsState.payments.methods.length
    ? operationSettingsState.payments.methods
    : DEFAULT_OPERATION_SETTINGS.payments.methods
  const selectedMethod = methods.includes(ticketPaymentMethod.value)
    ? ticketPaymentMethod.value
    : operationSettingsState.payments.defaultMethod
  const defaultMethod = methods.includes(selectedMethod) ? selectedMethod : methods[0]

  ticketPaymentMethod.innerHTML = methods
    .map(method => `<option ${method === defaultMethod ? 'selected' : ''}>${escapeHtml(method)}</option>`)
    .join('')

  refreshCustomSelect(ticketPaymentMethod)
}

const syncTicketClientControls = () => {
  const newFields = document.querySelector('.ticket-client-new')

  newFields?.classList.toggle('hidden', ticketClientSelect?.value !== 'new')
}

const renderTicketClientOptions = () => {
  if (!ticketClientSelect) {
    return
  }

  const selectedClientId = ticketClientSelect.value

  ticketClientSelect.innerHTML = `
    <option value="">Sin cliente</option>
    ${clientesState.map(cliente => `
      <option value="${escapeHtml(cliente.id)}" ${String(cliente.id) === selectedClientId ? 'selected' : ''}>
        ${escapeHtml(cliente.nombre)}${cliente.telefono ? ` - ${escapeHtml(cliente.telefono)}` : ''}
      </option>
    `).join('')}
    <option value="new" ${selectedClientId === 'new' ? 'selected' : ''}>Agregar cliente</option>
  `

  syncTicketClientControls()
  refreshCustomSelect(ticketClientSelect)
}

const renderNextTicketNumber = () => {
  if (!ticketNumber) {
    return
  }

  const nextId = ventasState.reduce((maxId, venta) => {
    return Math.max(maxId, Number(venta.id) || 0)
  }, 0) + 1

  ticketNumber.innerText = formatTicketNumber(nextId)
}

const resetTicketClient = () => {
  if (ticketClientSelect) {
    ticketClientSelect.value = ''
  }

  if (ticketClientName) {
    ticketClientName.value = ''
  }

  if (ticketClientPhone) {
    ticketClientPhone.value = ''
  }

  syncTicketClientControls()
}

const resolveTicketClient = async () => {
  const selectedClientId = ticketClientSelect?.value || ''

  if (!selectedClientId) {
    return null
  }

  if (selectedClientId !== 'new') {
    return clientesState.find(item => String(item.id) === String(selectedClientId)) || null
  }

  const nombre = ticketClientName?.value.trim() || ''
  const telefono = ticketClientPhone?.value.trim() || ''

  if (!nombre) {
    await showAppDialog({
      title: 'Nombre requerido',
      message: 'Escribe el nombre del cliente nuevo antes de cobrar.',
      confirmText: 'Entendido',
      showCancel: false
    })

    return undefined
  }

  return apiRequest('/api/clientes', {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      telefono
    })
  })
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

      <div class="cart-item-actions">
        <div class="quantity-control">
          <button type="button" data-ticket-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
          <input type="number" min="1" step="1" value="${escapeHtml(item.cantidad)}" data-ticket-action="quantity" data-id="${escapeHtml(item.id)}">
          <button type="button" data-ticket-action="increase" data-id="${escapeHtml(item.id)}">+</button>
        </div>

        <strong>${money(unitPrice * item.cantidad)}</strong>
        <button class="remove-ticket-item" type="button" data-ticket-action="remove" data-id="${escapeHtml(item.id)}">&times;</button>
      </div>
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

const showTicketDialog = (title, content, options = {}) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    const logo = options.logo ?? operationSettingsState.printer.logo
    const canPrint = options.canPrint !== false
    dialog.className = 'app-dialog show-modal'
    dialog.innerHTML = `
      <div class="app-dialog-content ticket-dialog">
        <h2>${escapeHtml(title)}</h2>
        ${logo ? `<img class="ticket-logo" src="${escapeHtml(logo)}" alt="Logo del ticket">` : ''}
        <pre>${escapeHtml(content)}</pre>
        <div class="app-dialog-actions">
          <button class="dialog-btn secondary" type="button" data-dialog-action="cancel">Cerrar</button>
          <button class="dialog-btn whatsapp" type="button" data-dialog-action="whatsapp">WhatsApp</button>
          ${canPrint ? '<button class="dialog-btn primary" type="button" data-dialog-action="confirm">Imprimir</button>' : ''}
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

      if (actionButton?.dataset.dialogAction === 'whatsapp') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(content)}`

        window.appShare?.sendWhatsApp(content).catch(() => {
          window.open(whatsappUrl, '_blank')
        }) || window.open(whatsappUrl, '_blank')
        return
      }

      if (actionButton?.dataset.dialogAction === 'cancel' || event.target === dialog) {
        closeDialog()
      }
    })

    document.body.appendChild(dialog)

    if (canPrint && operationSettingsState.printer.autoPrint) {
      window.print()
    }
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
  const editableResources = new Set(['producto', 'materia', 'cliente', 'pedido', 'gasto', 'proveedor'])

  return `
    <div class="row-actions">
      ${editableResources.has(resource)
        ? `<button class="action-btn edit" type="button" data-action="edit" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Editar" aria-label="Editar">
            &#9998;
          </button>`
        : ''}
      ${resource === 'pedido'
        ? `<button class="action-btn ticket" type="button" data-action="ticket" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Ticket de pedido" aria-label="Ticket de pedido">
            &#129534;
          </button>`
        : ''}
      ${resource === 'venta'
        ? `<button class="action-btn ticket" type="button" data-action="ticket" data-resource="${resource}" data-id="${escapeHtml(id)}" title="Reimprimir ticket" aria-label="Reimprimir ticket">
            &#128438;
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

const buildVentaTicket = ({ id, metodoPago, items, total, tipo = 'TICKET DE COMPRA', concepto = '', cliente = null, telefono = null, createdAt = new Date().toISOString() }) => {
  const clienteNombre = typeof cliente === 'string' ? cliente : cliente?.nombre
  const clienteTelefono = telefono || (typeof cliente === 'string' ? '' : cliente?.telefono)
  const ticketType = tipo === 'Venta' ? 'TICKET DE COMPRA' : tipo

  return [
    operationSettingsState.printer.header || 'PALETERIA NOPALUCAN',
    ticketType,
    id ? `Folio ${formatTicketNumber(id)}` : '',
    concepto ? `Concepto: ${concepto}` : '',
    clienteNombre ? `Cliente: ${clienteNombre}` : '',
    clienteTelefono ? `Telefono: ${clienteTelefono}` : '',
    `Fecha: ${formatDateTime(createdAt)}`,
    `Metodo: ${metodoPago}`,
    '',
    'Productos:',
    ...items.map(item => `${item.cantidad} x ${item.nombre} ${money(item.total)}`),
    '',
    Number(total || 0) !== items.reduce((sum, item) => sum + Number(item.total || 0), 0)
      ? `Ajuste: ${money(Number(total || 0) - items.reduce((sum, item) => sum + Number(item.total || 0), 0))}`
      : '',
    `Total: ${money(total)}`,
    '',
    operationSettingsState.printer.footer || 'Gracias por su compra.'
  ].filter(Boolean).join('\n')
}

const buildTicketPreview = ({ header, footer }) => {
  return [
    header || DEFAULT_OPERATION_SETTINGS.printer.header,
    'TICKET DE COMPRA',
    'Folio #0001',
    'Cliente: Cliente de ejemplo',
    'Telefono: 2481234567',
    `Fecha: ${formatDateTime(new Date().toISOString())}`,
    `Metodo: ${operationSettingsState.payments.defaultMethod || 'Efectivo'}`,
    '',
    'Productos:',
    `2 x Boli leche ${money(20)}`,
    `1 x Bote nuez ${money(210)}`,
    '',
    `Total: ${money(230)}`,
    '',
    footer || DEFAULT_OPERATION_SETTINGS.printer.footer
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

  const subtotal = ticketItems.reduce((sum, item) => {
    return sum + getWholesalePrice(item) * item.cantidad
  }, 0)
  const total = subtotal + getPaymentFee(subtotal)

  cartTotal.innerText = money(total)
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
      precioPremium: Number(producto.precioPremium || 0),
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
        precioPremium: Number(producto.precioPremium || 0),
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
      <div class="empty-state product-empty-state">
        <div class="product-empty-icon" aria-hidden="true"></div>
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
      ${producto.precioPremium
        ? `<small>Premium ${money(producto.precioPremium)}</small>`
        : ''}
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
    setTableMessage(materiaContainer, 6, 'No hay materia prima registrada')
    return
  }

  materiaContainer.innerHTML = items.map(item => `
    <tr class="${Number(item.stock) <= 3 ? 'low-stock-row' : ''}">
      <td>${escapeHtml(item.nombre)}</td>
      <td>${escapeHtml(item.stock)}</td>
      <td>${escapeHtml(item.unidad)}</td>
      <td>${money(item.costo)}</td>
      <td>${escapeHtml(item.proveedor?.nombre || 'Sin proveedor')}</td>
      <td>${renderActionButtons('materia', item.id)}</td>
    </tr>
  `).join('')
}

const renderClientes = (clientes) => {
  clientesState = clientes
  renderTicketClientOptions()

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
  renderNextTicketNumber()

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
        ${venta.cliente ? `<small>Cliente: ${escapeHtml(venta.cliente)}</small>` : ''}
      </td>
      <td>${escapeHtml(summarizeItems(venta.items))}</td>
      <td>${money(venta.total)}</td>
      <td>${renderActionButtons('venta', venta.id)}</td>
    </tr>
  `).join('')
}

const renderCorteCaja = (corte = {}) => {
  const totalVentas = Number(corte.totalVentas || 0)
  const totalGastos = Number(corte.totalGastos || 0)
  const saldo = Number(corte.saldo ?? totalVentas - totalGastos)
  const gastos = Array.isArray(corte.gastos) ? corte.gastos : []

  gastosState = gastos
  cashTotalSales.innerText = money(totalVentas)
  cashTotalExpenses.innerText = money(totalGastos)
  cashBalance.innerText = money(saldo)

  if (!gastos.length) {
    setTableMessage(gastosContainer, 6, 'No hay gastos registrados')
    return
  }

  gastosContainer.innerHTML = gastos.map(gasto => `
    <tr>
      <td>${escapeHtml(formatDateTime(gasto.createdAt))}</td>
      <td>${escapeHtml(gasto.concepto)}</td>
      <td>${escapeHtml(gasto.categoria || 'General')}</td>
      <td>${money(gasto.monto)}</td>
      <td>${escapeHtml(gasto.notas || 'Sin notas')}</td>
      <td>${renderActionButtons('gasto', gasto.id)}</td>
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

    try {
      renderCorteCaja(await apiRequest('/api/corte-caja'))
    } catch (error) {
      renderCorteCaja({
        totalVentas: ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0),
        totalGastos: 0,
        gastos: []
      })
    }
  } catch (error) {
    setSystemStatus('offline', 'Sin conexion a API o base')

    productsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No se pudo conectar con la API</h3>
        <p>Revisa la URL en Configuracion o ejecuta la API local.</p>
      </div>
    `

    setTableMessage(materiaContainer, 6, 'No se pudo cargar la materia prima')
    setTableMessage(clientesContainer, 3, 'No se pudieron cargar los clientes')
    setTableMessage(proveedoresContainer, 6, 'No se pudieron cargar los proveedores')
    setTableMessage(pedidosContainer, 6, 'No se pudieron cargar los pedidos')
    setTableMessage(ventasContainer, 5, 'No se pudieron cargar las ventas')
    setTableMessage(gastosContainer, 6, 'No se pudieron cargar los gastos')
    renderCorteCaja()
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
      <small>Archivo: ${escapeHtml(configPathState || 'paleteria-pos.config')}</small>
    </div>
  `)

  document.getElementById('api-settings-form').addEventListener('submit', async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const apiUrl = formData.get('apiUrl').trim()

    apiUrlState = window.appConfig
      ? await window.appConfig.setApiUrl(apiUrl)
      : apiUrl.replace(/\/$/, '')

    await loadData()
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
        <label>Precio normal</label>
        <input name="precio" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precio ?? '')}" required>
      </div>

      <div class="form-group">
        <label>Precio Premium</label>
        <input name="precioPremium" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(producto?.precioPremium ?? '')}">
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
        <label>Stock actual</label>
        <input name="stock" type="number" min="0" step="1" placeholder="0" value="${escapeHtml(producto?.stock ?? 0)}">
      </div>

      <div class="form-group">
        <label>Agregar stock</label>
        <input name="stockNuevo" type="number" min="0" step="1" placeholder="0" value="">
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
        <label>Costo de compra</label>
        <input name="costo" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(item?.costo ?? '')}" required>
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

const renderGastoModal = (gasto = null) => {
  const isEditing = Boolean(gasto)

  modalTitle.innerText = isEditing ? 'Editar Gasto' : 'Nuevo Gasto'
  modalBody.innerHTML = `
    <form data-resource="gasto" ${isEditing ? `data-id="${escapeHtml(gasto.id)}"` : ''}>
      <div class="form-group">
        <label>Concepto</label>
        <input name="concepto" type="text" placeholder="Ej. Compra de insumos" value="${escapeHtml(gasto?.concepto || '')}" required>
      </div>

      <div class="form-group">
        <label>Categoria</label>
        <select name="categoria">
          <option ${!gasto || gasto?.categoria === 'General' ? 'selected' : ''}>General</option>
          <option ${gasto?.categoria === 'Insumos' ? 'selected' : ''}>Insumos</option>
          <option ${gasto?.categoria === 'Servicios' ? 'selected' : ''}>Servicios</option>
          <option ${gasto?.categoria === 'Renta' ? 'selected' : ''}>Renta</option>
          <option ${gasto?.categoria === 'Nomina' ? 'selected' : ''}>Nomina</option>
          <option ${gasto?.categoria === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
          <option ${gasto?.categoria === 'Otro' ? 'selected' : ''}>Otro</option>
        </select>
      </div>

      <div class="form-group">
        <label>Monto</label>
        <input name="monto" type="number" min="0" step="0.01" placeholder="$0.00" value="${escapeHtml(gasto?.monto ?? '')}" required>
      </div>

      <div class="form-group">
        <label>Notas</label>
        <textarea name="notas" placeholder="Detalles opcionales">${escapeHtml(gasto?.notas || '')}</textarea>
      </div>

      <button class="save-btn" type="submit">${isEditing ? 'Guardar cambios' : 'Guardar gasto'}</button>
    </form>
  `
}

const renderTicketSettingsModal = () => {
  const printer = operationSettingsState.printer

  modalTitle.innerText = 'Configurar ticket'
  modalBody.innerHTML = `
    <form data-operation-form="ticket">
      <div class="form-group">
        <label>Forma del ticket</label>
        <select name="deliveryMode">
          <option value="digital" ${printer.deliveryMode === 'digital' ? 'selected' : ''}>Digital</option>
          <option value="printer" ${printer.deliveryMode === 'printer' ? 'selected' : ''}>Impresora</option>
        </select>
      </div>

      <div class="form-group">
        <label>Encabezado del ticket</label>
        <textarea name="header" placeholder="Nombre del negocio">${escapeHtml(printer.header || '')}</textarea>
      </div>

      <div class="form-group">
        <label>Imagen superior del ticket</label>
        <label class="image-upload">
          <input id="ticket-logo-file" type="file" accept="image/*">
          <span>Seleccionar imagen</span>
        </label>
        <input id="ticket-logo" name="logo" type="hidden" value="${escapeHtml(printer.logo || '')}">
        <div class="image-preview ticket-logo-preview ${printer.logo ? 'has-image' : ''}" id="ticket-logo-preview">
          ${printer.logo ? `<img src="${escapeHtml(printer.logo)}" alt="Logo del ticket">` : '<span>Sin imagen</span>'}
        </div>
        <button class="dialog-btn secondary ticket-logo-remove" type="button" id="remove-ticket-logo">Quitar imagen</button>
      </div>

      <div class="form-group">
        <label>Pie del ticket</label>
        <textarea name="footer" placeholder="Mensaje final">${escapeHtml(printer.footer || '')}</textarea>
      </div>

      <div class="settings-form-actions">
        <button class="dialog-btn secondary" type="button" id="preview-ticket-settings">Vista previa</button>
      </div>

      <button class="save-btn" type="submit">Guardar ticket</button>
    </form>
  `
}

const renderPrinterSettingsModal = () => {
  const printer = operationSettingsState.printer

  modalTitle.innerText = 'Configurar impresora'
  modalBody.innerHTML = `
    <form data-operation-form="printer">
      <div class="form-group">
        <label>Impresora predeterminada</label>
        <input name="name" type="text" placeholder="Nombre de la impresora" value="${escapeHtml(printer.name || '')}">
      </div>

      <div class="form-group">
        <label>Ancho del ticket</label>
        <select name="ticketWidth">
          <option value="58" ${printer.ticketWidth === '58' ? 'selected' : ''}>58 mm</option>
          <option value="80" ${printer.ticketWidth === '80' ? 'selected' : ''}>80 mm</option>
        </select>
      </div>

      <div class="form-group">
        <label>Copias</label>
        <input name="copies" type="number" min="1" max="5" step="1" value="${escapeHtml(printer.copies || '1')}" required>
      </div>

      <label class="settings-toggle">
        <input name="autoPrint" type="checkbox" ${printer.autoPrint ? 'checked' : ''}>
        <span>Imprimir automaticamente al mostrar el ticket</span>
      </label>

      <button class="save-btn" type="submit">Guardar impresora</button>
    </form>
  `
}

const renderPaymentSettingsModal = () => {
  const payments = operationSettingsState.payments

  modalTitle.innerText = 'Configurar pagos'
  modalBody.innerHTML = `
    <form data-operation-form="payments">
      <div class="form-group">
        <label>Metodos disponibles</label>
        <textarea name="methods" placeholder="Un metodo por linea" required>${escapeHtml(payments.methods.join('\n'))}</textarea>
      </div>

      <div class="form-group">
        <label>Metodo predeterminado</label>
        <input name="defaultMethod" type="text" placeholder="Efectivo" value="${escapeHtml(payments.defaultMethod || 'Efectivo')}" required>
      </div>

      <div class="form-group">
        <label>Comision tarjeta (%)</label>
        <input name="cardFeePercent" type="number" min="0" max="100" step="0.01" value="${escapeHtml(payments.cardFeePercent || '0')}">
      </div>

      <label class="settings-toggle">
        <input name="allowMixed" type="checkbox" ${payments.allowMixed ? 'checked' : ''}>
        <span>Permitir pago mixto</span>
      </label>

      <button class="save-btn" type="submit">Guardar pagos</button>
    </form>
  `
}

const openOperationSettingsModal = (type) => {
  modal.classList.add('show-modal')

  if (type === 'ticket') {
    renderTicketSettingsModal()
  }

  if (type === 'printer') {
    renderPrinterSettingsModal()
  }

  if (type === 'payments') {
    renderPaymentSettingsModal()
  }

  enhanceCustomSelects(modalBody)
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

  if (type === 'gasto') {
    renderGastoModal(record)
  }

  enhanceCustomSelects(modalBody)
}

buttons.forEach(button => {
  button.addEventListener('click', async () => {
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

document.querySelectorAll('[data-operation-setting]').forEach(button => {
  button.addEventListener('click', () => {
    openOperationSettingsModal(button.dataset.operationSetting)
  })
})

monthlyCashReport.addEventListener('click', showMonthlyCashReport)

themeToggle.addEventListener('click', async () => {
  await applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark')
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
gastosContainer.addEventListener('click', handleActionClick)
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

ticketClientSelect?.addEventListener('change', syncTicketClientControls)
ticketPaymentMethod?.addEventListener('change', renderTicket)

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
  const cliente = await resolveTicketClient()

  if (cliente === undefined) {
    return
  }

  const items = getTicketItems()
  const total = getTicketChargeTotal(metodoPago)
  const pendingVenta = {
    id: null,
    metodoPago,
    tipo: 'Venta',
    concepto: 'Venta de mostrador',
    cliente,
    telefono: cliente?.telefono || null,
    items,
    total
  }
  const ticket = buildVentaTicket(pendingVenta)
  const venta = await apiRequest('/api/ventas', {
    method: 'POST',
    body: JSON.stringify({
      total,
      metodoPago,
      tipo: 'Venta',
      concepto: 'Venta de mostrador',
      clienteId: cliente?.id || null,
      cliente: cliente?.nombre || null,
      telefono: cliente?.telefono || null,
      items,
      ticket
    })
  })

  const isPrinterMode = operationSettingsState.printer.deliveryMode === 'printer'

  await showTicketDialog('Ticket de compra', venta.ticket || ticket, {
    canPrint: isPrinterMode
  })

  ticketItems = []
  resetTicketClient()
  renderTicket()
  loadData()
})

cancelTicket.addEventListener('click', async () => {
  if (!ticketItems.length && !ticketClientSelect?.value) {
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
  resetTicketClient()
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

  if (!['producto-imagen-file', 'ticket-logo-file'].includes(event.target.id)) {
    return
  }

  const [file] = event.target.files

  if (!file) {
    return
  }

  const dataUrl = await fileToDataUrl(file)
  const isTicketLogo = event.target.id === 'ticket-logo-file'
  const imageInput = document.getElementById(isTicketLogo ? 'ticket-logo' : 'producto-imagen')
  const preview = document.getElementById(isTicketLogo ? 'ticket-logo-preview' : 'producto-imagen-preview')

  imageInput.value = dataUrl
  preview.classList.add('has-image')
  preview.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="${isTicketLogo ? 'Logo del ticket' : 'Vista previa del producto'}">`
})

modalBody.addEventListener('click', (event) => {
  if (event.target.id === 'preview-ticket-settings') {
    const form = event.target.closest('form')
    const formData = new FormData(form)
    const deliveryMode = formData.get('deliveryMode') === 'printer' ? 'printer' : 'digital'
    const previewContent = buildTicketPreview({
      header: formData.get('header')?.trim(),
      footer: formData.get('footer')?.trim()
    })

    showTicketDialog(
      deliveryMode === 'printer' ? 'Vista previa ticket impreso' : 'Vista previa ticket digital',
      previewContent,
      {
        canPrint: deliveryMode === 'printer',
        logo: formData.get('logo') || ''
      }
    )
    return
  }

  if (event.target.id !== 'remove-ticket-logo') {
    return
  }

  const imageInput = document.getElementById('ticket-logo')
  const preview = document.getElementById('ticket-logo-preview')

  if (imageInput) {
    imageInput.value = ''
  }

  if (preview) {
    preview.classList.remove('has-image')
    preview.innerHTML = '<span>Sin imagen</span>'
  }
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
  const operationForm = form.dataset.operationForm

  if (operationForm === 'ticket') {
    await saveOperationSettings({
      printer: {
        deliveryMode: data.deliveryMode === 'printer' ? 'printer' : 'digital',
        header: data.header.trim() || DEFAULT_OPERATION_SETTINGS.printer.header,
        footer: data.footer.trim() || DEFAULT_OPERATION_SETTINGS.printer.footer,
        logo: data.logo || ''
      }
    })

    closeCurrentModal()
    return
  }

  if (operationForm === 'printer') {
    await saveOperationSettings({
      printer: {
        name: data.name.trim(),
        ticketWidth: data.ticketWidth,
        copies: String(Math.max(1, Math.min(5, Math.floor(Number(data.copies) || 1)))),
        autoPrint: formData.has('autoPrint')
      }
    })

    closeCurrentModal()
    return
  }

  if (operationForm === 'payments') {
    const methods = data.methods
      .split(/\r?\n/)
      .map(method => method.trim())
      .filter(Boolean)
    const nextMethods = methods.length ? Array.from(new Set(methods)) : DEFAULT_OPERATION_SETTINGS.payments.methods
    const defaultMethod = nextMethods.includes(data.defaultMethod.trim())
      ? data.defaultMethod.trim()
      : nextMethods[0]

    await saveOperationSettings({
      payments: {
        methods: nextMethods,
        defaultMethod,
        cardFeePercent: String(Math.max(0, Number(data.cardFeePercent) || 0)),
        allowMixed: formData.has('allowMixed')
      }
    })

    closeCurrentModal()
    renderTicket()
    return
  }

  const resource = form.dataset.resource
  const isEditing = Boolean(form.dataset.id)
  const config = resourceConfig[resource]

  if (resource === 'producto') {
    const stockActual = Math.max(0, Math.floor(Number(data.stock) || 0))
    const stockNuevo = Math.max(0, Math.floor(Number(data.stockNuevo) || 0))

    data.stock = String(stockActual + stockNuevo)
    delete data.stockNuevo
  }

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

document.addEventListener('wheel', preventFocusedNumberInputWheel, { passive: false })

window.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeCurrentModal()
  }

  if (!event.target.closest('.custom-select')) {
    closeCustomSelects()
  }
})

const boot = async () => {
  await applyTheme(localStorage.getItem('theme') || 'light', { persist: false })

  if (window.appConfig?.getTheme) {
    await applyTheme(await window.appConfig.getTheme(), { persist: false })
  }

  await initConfig()
  renderPaymentMethods()
  enhanceCustomSelects()
  syncTicketClientControls()
  renderApiSettings()
  loadData()
}

boot()
