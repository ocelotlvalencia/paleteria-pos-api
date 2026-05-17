# Manual de usuario - Punto de Venta

Sistema de punto de venta para paleteria. Permite administrar productos, materia prima, clientes, pedidos, ventas, corte de caja, proveedores, tickets, pagos y configuraciones de operacion.

## 1. Instalacion

1. Ejecuta el instalador:

   ```text
   Punto de Venta Setup 1.0.0.exe
   ```

2. Sigue el asistente de instalacion.
3. Abre la aplicacion desde el acceso directo o desde el menu de inicio.
4. Verifica que el estado del sistema indique conexion correcta.

La aplicacion usa la API en linea configurada en `paleteria-pos.config`. Si no cargan productos, ventas o clientes, revisa la conexion a internet y la URL de la API.

## 2. Pantalla principal

La pantalla se divide en tres zonas:

- Menu lateral: permite entrar a Productos, Materia Prima, Clientes, Pedidos, Ventas, Corte de caja, Proveedores y Configuracion.
- Area principal: muestra la seccion seleccionada.
- Ticket: panel derecho para agregar productos y cobrar ventas.

El boton de luna cambia entre modo claro y modo oscuro. El sistema recuerda el ultimo tema usado.

## 3. Productos

En Productos se registran los productos que se venden al cliente.

### Agregar producto

1. Entra a Productos.
2. Presiona `+ Nuevo producto`.
3. Captura:
   - Nombre del producto.
   - Foto, si aplica.
   - Precio normal.
   - Precio Premium, si aplica.
   - Precio mayoreo, si aplica.
   - Cantidad para mayoreo.
   - Categoria.
   - Stock actual.
   - Agregar stock, si estas aumentando inventario.
4. Presiona `Guardar producto`.

### Editar producto

1. En la tarjeta del producto, presiona el boton de editar.
2. Cambia los datos necesarios.
3. Si quieres aumentar inventario, usa `Agregar stock`.
4. Presiona `Guardar cambios`.

### Eliminar producto

1. En la tarjeta del producto, presiona eliminar.
2. Confirma la accion.

### Precio Premium, Plus y mayoreo

El sistema ajusta precios automaticamente segun el cliente y la cantidad:

- Cliente General: usa precio normal, excepto si alcanza mayoreo.
- Cliente Premium: puede usar precio Premium si el producto lo tiene.
- Cliente Plus: usa precio mayoreo desde 1 producto cuando el producto tiene precio mayoreo.
- Mayoreo por categoria: si varios productos de la misma categoria alcanzan la cantidad configurada, se aplica precio mayoreo.

El sistema usa el menor precio disponible entre normal, Premium y mayoreo.

## 4. Ticket y ventas

El ticket esta en el lado derecho.

### Cobrar venta

1. Haz clic en los productos que deseas vender.
2. Ajusta cantidades con `+`, `-` o escribiendo la cantidad.
3. Selecciona cliente:
   - Sin cliente.
   - Cliente registrado.
   - Agregar cliente.
4. Selecciona metodo de pago.
5. Presiona `Cobrar`.
6. El sistema guarda la venta y muestra el ticket.

### Transferencia

Si seleccionas un metodo que contenga la palabra `Transferencia`, el sistema muestra un modal con:

- Numero CLABE interbancaria.
- Beneficiario.
- Banco.
- Concepto.

El modal solo es informativo para compartir los datos al cliente.

### Cancelar ticket

Presiona `Cancelar` para limpiar el ticket actual. El sistema pide confirmacion.

## 5. Materia Prima

En Materia Prima se controlan ingredientes e insumos.

### Agregar materia prima

1. Entra a Materia Prima.
2. Presiona `+ Nueva materia prima`.
3. Captura:
   - Nombre.
   - Stock actual.
   - Descontar stock, si estas usando inventario.
   - Unidad.
   - Costo de compra.
   - Proveedor.
4. Presiona `Guardar materia prima`.

### Unidades disponibles

- Litros.
- Kilos.
- Gramos.
- Piezas.

### Descontar stock

Cuando editas una materia prima puedes usar `Descontar stock`. El sistema resta esa cantidad al stock actual.

Ejemplo:

```text
Stock actual: 10 litros
Descontar stock: 2 litros
Stock final: 8 litros
```

### Stock bajo de materia prima

La alerta aparece en la seccion Materia Prima. Los limites se configuran en:

```text
Configuracion > Operacion > Stock materia prima
```

Puedes definir limites por unidad. Ejemplo:

```text
Litros: 1
Kilos: 3
Gramos: 500
Piezas: 5
```

Si una materia prima esta en una unidad con limite `1`, solo marcara stock bajo cuando su stock sea igual o menor a `1`.

## 6. Clientes

En Clientes se registran compradores frecuentes.

### Agregar cliente

1. Entra a Clientes.
2. Presiona `+ Nuevo cliente`.
3. Captura:
   - Nombre.
   - Telefono.
   - Categoria.
4. Presiona `Guardar cliente`.

### Categorias de cliente

- General.
- Premium.
- Plus.

Estas categorias afectan el precio automatico en ticket y pedidos.

## 7. Pedidos

En Pedidos se registran apartados, encargos y entregas futuras.

### Crear pedido

1. Entra a Pedidos.
2. Presiona `+ Nuevo pedido`.
3. Selecciona un cliente registrado o elige `Agregar cliente`.
4. Si agregas cliente, captura su categoria.
5. Selecciona productos registrados y cantidad.
6. Presiona `Agregar producto` para cada producto del pedido.
7. Si el producto no esta registrado, puedes escribir el pedido manualmente.
8. Captura fecha de entrega.
9. Revisa total, anticipo, metodo de anticipo y metodo al entregar.
10. Presiona `Guardar pedido`.

### Precios automaticos en pedidos

Los pedidos tambien ajustan precio por:

- Cantidad.
- Categoria del producto.
- Cliente General, Premium o Plus.
- Precio mayoreo y Premium configurado en productos.

### Anticipo

Si el pedido tiene anticipo mayor a `0`, el sistema lo registra como venta tipo anticipo. Despues de crearse esa venta, el monto del anticipo ya no se puede editar desde el pedido.

Si el metodo de anticipo es Transferencia, se muestra el modal con los datos bancarios.

### Estados

Los pedidos pueden estar en:

- En preparacion: amarillo.
- Entregado: verde.
- Cancelado: rojo.

La opcion Cancelado aparece al editar un pedido existente. Si se cancela un pedido con anticipo, el sistema registra que se regreso el anticipo y quita ese monto de ventas.

## 8. Ventas

En Ventas se consulta el historial de cobros.

La tabla muestra:

- Fecha.
- Metodo de pago.
- Productos o concepto.
- Total.
- Acciones.

Desde acciones puedes reimprimir o consultar el ticket de venta.

## 9. Corte de caja

En Corte de caja se revisa:

- Total de ventas.
- Total de gastos.
- Saldo.
- Historial de gastos.

### Registrar gasto

1. Entra a Corte de caja.
2. Presiona `+ Nuevo gasto`.
3. Captura concepto, categoria, monto y notas.
4. Presiona `Guardar gasto`.

El boton de calendario muestra el resumen mensual.

## 10. Proveedores

En Proveedores se registran quienes abastecen materia prima.

### Agregar proveedor

1. Entra a Proveedores.
2. Presiona `+ Nuevo proveedor`.
3. Captura:
   - Proveedor.
   - Contacto.
   - Telefono.
   - Descripcion.
4. Presiona `Guardar proveedor`.

Los proveedores aparecen como opcion al crear o editar materia prima.

## 11. Configuracion

La seccion Configuracion esta protegida por acceso. Si entras a una subseccion de Configuracion y luego cambias a otra seccion del menu principal, el acceso se cierra automaticamente.

### Operacion

Incluye:

- Ticket.
- Impresora.
- Pagos.
- Categorias.
- Notificaciones.
- Stock materia prima.

### Ticket

Permite configurar:

- Forma del ticket: digital o impresora.
- Encabezado.
- Imagen superior para ticket impreso.
- Pie del ticket.
- Vista previa.

### Impresora

Permite configurar:

- Impresora predeterminada.
- Ancho del ticket: 58 mm u 80 mm.
- Numero de copias.
- Impresion automatica.

### Pagos

Permite configurar:

- Metodos disponibles, uno por linea.
- Metodo predeterminado.
- Comision de tarjeta.
- Pago mixto.
- Datos para transferencia.

### Categorias de productos

Permite dar de alta, editar y eliminar categorias. Estas categorias se seleccionan al crear o editar productos.

### Notificaciones de productos

Permite configurar alertas de stock bajo por categoria de producto.

Cuando hay productos en stock bajo:

- El logo parpadea.
- Se muestra una burbuja con el numero de notificaciones.

### Stock materia prima

Permite configurar alertas por unidad:

- Litros.
- Kilos.
- Gramos.
- Piezas.

La alerta se muestra en la seccion Materia Prima.

### Administracion

Permite administrar usuarios y permisos.

Permisos disponibles:

- Corte de caja.
- Configuracion: Operacion.
- Configuracion: Administracion.
- Configuracion: Conexion.

### Conexion

Permite revisar o cambiar la URL de la API.

## 12. Archivo paleteria-pos.config

El archivo `paleteria-pos.config` guarda configuraciones locales del programa instalado, como:

- URL de la API.
- Tema claro u oscuro.
- Configuracion de ticket.
- Metodos de pago.
- Datos de transferencia.
- Notificaciones y limites de stock.

En el `.exe`, este archivo se guarda localmente para cada instalacion. No se recomienda modificarlo manualmente salvo mantenimiento tecnico.

## 13. Crear instalador

Esta parte es para mantenimiento tecnico.

Desde la carpeta `app` ejecuta:

```bash
npm run dist
```

El instalador se genera en:

```text
app/dist/Punto de Venta Setup 1.0.0.exe
```

## 14. Recomendaciones para el cliente

- Registrar primero categorias de productos.
- Registrar proveedores antes de materia prima.
- Registrar productos antes de comenzar ventas.
- Configurar metodos de pago y datos de transferencia.
- Configurar limites de stock antes de operar.
- Revisar Corte de caja al final de cada dia.
- Usar pedidos para apartados o entregas futuras.

## 15. Problemas comunes

### No cargan datos

Revisa:

- Conexion a internet.
- URL de la API.
- Estado de la API.

### No guarda configuracion

En el `.exe` la configuracion se guarda localmente. Si se prueba desde navegador o Vercel, algunas configuraciones locales pueden no persistir igual que en el ejecutable.

### El menu File / Edit / View / Window aparece

El `.exe` actualizado ya lo oculta. Si aparece, instala la version mas reciente.

### La transferencia no muestra datos

Entra a:

```text
Configuracion > Operacion > Pagos
```

Y captura CLABE, beneficiario, banco y concepto.

### El stock bajo no coincide

Revisa los limites en:

```text
Configuracion > Operacion > Notificaciones
Configuracion > Operacion > Stock materia prima
```

Recuerda que el aviso aparece cuando el stock es igual o menor al limite configurado.
