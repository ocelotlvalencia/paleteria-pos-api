# Manual de usuario - Punto de Venta

Este manual explica como usar la aplicacion **Punto de Venta** para administrar productos, clientes, pedidos, ventas, gastos, proveedores y tickets.

## 1. Primer inicio

1. Abre el instalador `Punto de Venta Setup 1.0.0.exe`.
2. Sigue los pasos de instalacion.
3. Abre la aplicacion desde el acceso directo o desde el menu de inicio.
4. Espera a que el indicador inferior del menu lateral muestre el estado del sistema.

El sistema usa una API en linea. Si aparece un mensaje de error al cargar datos, revisa tu conexion a internet o la configuracion de la API.

## 2. Pantalla principal

La aplicacion se divide en tres zonas:

- **Menu lateral:** permite cambiar entre Productos, Materia Prima, Clientes, Pedidos, Ventas, Corte de caja, Proveedores y Configuracion.
- **Area central:** muestra la seccion seleccionada y sus registros.
- **Ticket:** aparece a la derecha y sirve para cobrar productos.

El boton de la luna en la parte superior del menu cambia entre modo claro y modo oscuro. La aplicacion recuerda el ultimo modo usado cuando la vuelves a abrir.

## 3. Productos

En **Productos** puedes registrar y administrar los productos que vendes.

Para agregar un producto:

1. Entra a **Productos**.
2. Presiona **+ Nuevo producto**.
3. Llena los datos:
   - Nombre del producto.
   - Foto, si deseas agregar una imagen.
   - Precio normal.
   - Precio mayoreo, si aplica.
   - Cantidad para mayoreo, si aplica.
   - Categoria.
   - Stock.
4. Presiona **Guardar producto**.

Para editar o eliminar un producto, usa los botones de accion que aparecen en la tarjeta del producto.

Para vender un producto, haz clic sobre su tarjeta. El producto se agregara al ticket.

## 4. Ticket y ventas

El ticket se encuentra del lado derecho de la pantalla.

Para cobrar una venta:

1. Haz clic en los productos que deseas vender.
2. Ajusta la cantidad con los botones `+` y `-`, o escribe la cantidad manualmente.
3. Selecciona el metodo de pago: **Efectivo** o **Tarjeta**.
4. Presiona **Cobrar**.
5. El sistema guardara la venta y mostrara el ticket de compra.

Para quitar un producto del ticket, usa el boton de eliminar en el producto dentro del ticket.

Para limpiar el ticket completo:

1. Presiona **Cancelar**.
2. Confirma que deseas limpiar el ticket.

Si intentas cobrar sin productos, el sistema mostrara una alerta indicando que debes agregar productos primero.

## 5. Materia Prima

En **Materia Prima** puedes controlar ingredientes e insumos.

Para agregar materia prima:

1. Entra a **Materia Prima**.
2. Presiona **+ Nueva materia prima**.
3. Captura nombre, stock, unidad, costo de compra y proveedor.
4. Presiona **Guardar materia prima**.

El costo de compra se registra automaticamente en **Corte de caja** como un gasto con categoria **Insumos**.

Si eliminas una materia prima, el gasto generado se conserva en **Corte de caja** como historial.

Las unidades disponibles son:

- Litros
- Kilos
- Piezas

Si un insumo tiene stock bajo, el sistema mostrara una alerta en la parte superior de la seccion.

## 6. Clientes

En **Clientes** puedes registrar los datos de tus clientes.

Para agregar un cliente:

1. Entra a **Clientes**.
2. Presiona **+ Nuevo cliente**.
3. Escribe el nombre y telefono.
4. Presiona **Guardar cliente**.

Los clientes registrados pueden seleccionarse al crear pedidos.

## 7. Pedidos

En **Pedidos** puedes registrar pedidos apartados o entregas futuras.

Para crear un pedido:

1. Entra a **Pedidos**.
2. Presiona **+ Nuevo pedido**.
3. Si el cliente ya esta registrado, seleccionalo en **Cliente registrado**.
4. Captura o revisa:
   - Cliente.
   - Telefono.
   - Detalle del pedido.
   - Fecha de entrega.
   - Total estimado.
   - Anticipo.
   - Metodo del anticipo.
   - Metodo al entregar.
   - Estado.
5. Presiona **Guardar pedido**.

Al guardar un pedido, la aplicacion muestra un ticket de pedido.

Estados disponibles:

- En preparacion.
- Entregado.
- Cancelado.

Cuando cambias el estado de un pedido, el sistema puede generar un ticket relacionado con el pedido.

## 8. Ventas

En **Ventas** puedes consultar el historial de ventas cobradas.

La tabla muestra:

- Fecha.
- Metodo de pago.
- Productos vendidos.
- Total.
- Acciones.

Desde las acciones puedes reimprimir o visualizar el ticket de una venta.

## 9. Corte de caja

En **Corte de caja** puedes revisar el total vendido, los gastos registrados y el saldo resultante.

La seccion muestra:

- Total de ventas.
- Total de gastos.
- Saldo final.
- Historial de gastos.

Para registrar un gasto:

1. Entra a **Corte de caja**.
2. Presiona **+ Nuevo gasto**.
3. Captura concepto, categoria, monto y notas opcionales.
4. Presiona **Guardar gasto**.

Puedes editar o eliminar gastos desde los botones de accion en la tabla.

El boton de resumen mensual muestra un modal con ventas, gastos y saldo agrupados por mes.

## 10. Proveedores

En **Proveedores** puedes registrar a quienes abastecen materia prima.

Para agregar un proveedor:

1. Entra a **Proveedores**.
2. Presiona **+ Nuevo proveedor**.
3. Captura proveedor, contacto, telefono y descripcion.
4. Presiona **Guardar proveedor**.

Los proveedores registrados aparecen como opcion al crear o editar materia prima.

## 11. Configuracion

La seccion **Configuracion** esta bloqueada desde la interfaz principal.

La URL de la API se guarda en el archivo de configuracion instalado:

```text
paleteria-pos.config
```

El archivo puede incluir:

```text
API_URL=URL_DE_TU_API
THEME=light
```

Valores posibles para `THEME`:

- `light`
- `dark`

Normalmente no necesitas editar este archivo, porque el modo claro/oscuro se guarda automaticamente al cambiarlo desde la app.

## 12. Modo claro y modo oscuro

Para cambiar el tema:

1. Presiona el boton de la luna en la parte superior izquierda.
2. La app cambiara entre modo claro y oscuro.
3. Al cerrar y abrir de nuevo, se conservara el ultimo modo usado.

## 13. Problemas comunes

### La app no carga productos o ventas

Revisa:

- Que tengas internet.
- Que la API este activa.
- Que la URL en `paleteria-pos.config` sea correcta.

### El ticket aparece vacio

Agrega productos haciendo clic en las tarjetas de productos. Si no hay productos registrados, primero crea uno en la seccion **Productos**.

### No puedo cobrar

Verifica que:

- El ticket tenga al menos un producto.
- La API este conectada.
- El producto tenga datos correctos de precio.

### No veo bien la aplicacion en modo oscuro

Cambia el tema con el boton de la luna. Si el problema continua, cierra y abre la aplicacion para que cargue nuevamente el tema guardado.

## 14. Recomendaciones de uso

- Registra primero proveedores y materia prima si quieres llevar control de insumos.
- Registra productos antes de comenzar ventas.
- Usa clientes registrados para pedidos frecuentes.
- Registra los gastos en **Corte de caja** para conocer el saldo real.
- Revisa la seccion **Ventas** al final del dia para consultar cobros realizados.
- Manten actualizados los precios y el stock de productos.

## 15. Comandos para desarrollo

Esta seccion es solo para mantenimiento tecnico.

Ejecutar la aplicacion de escritorio:

```bash
cd app
npm install
npm run dev
```

Crear instalador de Windows:

```bash
cd app
npm run dist
```

Ejecutar la API local:

```bash
cd paleteria-pos-api
npm install
npm run dev
```

La API necesita un archivo `.env` dentro de `paleteria-pos-api/`.
Usa `paleteria-pos-api/.env.example` como base.
