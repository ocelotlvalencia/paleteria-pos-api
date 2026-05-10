const buttons = document.querySelectorAll('.category')
const sections = document.querySelectorAll('.section')

const modal = document.getElementById('modal')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')
const closeModal = document.getElementById('close-modal')

/* SIDEBAR NAVIGATION */

buttons.forEach(button => {

  button.addEventListener('click', () => {

    buttons.forEach(btn => {
      btn.classList.remove('active')
    })

    button.classList.add('active')

    sections.forEach(section => {
      section.classList.remove('active-section')
    })

    const sectionId = button.dataset.section

    document
      .getElementById(sectionId)
      .classList.add('active-section')

  })

})

/* OPEN MODALS */

document.querySelectorAll('.add-btn').forEach(button => {

  button.addEventListener('click', () => {

    const type = button.dataset.type

    modal.classList.add('show-modal')

    /* PRODUCTOS */

    if(type === 'producto') {

      modalTitle.innerText = 'Nuevo Producto'

      modalBody.innerHTML = `
        <div class="form-group">
          <label>Nombre del producto</label>
          <input type="text" placeholder="Ej. Paleta Mango">
        </div>

        <div class="form-group">
          <label>Precio</label>
          <input type="number" placeholder="$0.00">
        </div>

        <div class="form-group">
          <label>Categoría</label>

          <select>
            <option>Paletas</option>
            <option>Helados</option>
            <option>Snacks</option>
          </select>
        </div>

        <button class="save-btn">
          Guardar producto
        </button>
      `
    }

    /* MATERIA PRIMA */

    if(type === 'materia') {

      modalTitle.innerText = 'Nueva Materia Prima'

      modalBody.innerHTML = `
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" placeholder="Ej. Leche">
        </div>

        <div class="form-group">
          <label>Stock</label>
          <input type="number" placeholder="0">
        </div>

        <div class="form-group">
          <label>Unidad</label>

          <select>
            <option>Litros</option>
            <option>Kilos</option>
            <option>Piezas</option>
          </select>
        </div>

        <button class="save-btn">
          Guardar materia prima
        </button>
      `
    }

    /* CLIENTES */

    if(type === 'cliente') {

      modalTitle.innerText = 'Nuevo Cliente'

      modalBody.innerHTML = `
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" placeholder="Nombre del cliente">
        </div>

        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" placeholder="2481234567">
        </div>

        <button class="save-btn">
          Guardar cliente
        </button>
      `
    }

    /* PROVEEDORES */

    if(type === 'proveedor') {

      modalTitle.innerText = 'Nuevo Proveedor'

      modalBody.innerHTML = `
        <div class="form-group">
          <label>Proveedor</label>
          <input type="text" placeholder="Nombre proveedor">
        </div>

        <div class="form-group">
          <label>Contacto</label>
          <input type="text" placeholder="Nombre contacto">
        </div>

        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" placeholder="2221234567">
        </div>

        <button class="save-btn">
          Guardar proveedor
        </button>
      `
    }

  })

})

/* CLOSE MODAL */

closeModal.addEventListener('click', () => {
  modal.classList.remove('show-modal')
})

window.addEventListener('click', (e) => {

  if(e.target === modal) {
    modal.classList.remove('show-modal')
  }

})