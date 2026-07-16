# TiendaExpress

Sistema de gestión de pedidos (OMS) para un e-commerce. Backend en Django + DRF + Celery/RabbitMQ, frontend en React.

## Cómo levantar el proyecto

1. Copia `.env.example` a `.env` y ajusta los valores si hace falta.
2. Levanta los servicios:

   ```bash
   docker-compose up --build
   ```

3. Servicios disponibles:
   - Django: http://localhost:8000
   - Panel de RabbitMQ: http://localhost:15672

## Migraciones y datos de prueba

Con los servicios levantados:

```bash
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py seed_data
```

El comando `seed_data` crea un usuario de prueba y 5 productos con distinto stock.

**Usuario de prueba:**
- Email: `demo@tiendaexpress.com`
- Password: `Demo12345!`

Con estas credenciales podés hacer login en `POST /api/auth/login/` y usar el `access` recibido para listar productos en `GET /api/products/`.

## Flujo de pedidos (asíncrono)

`POST /api/orders/` valida stock y crea el pedido en `PENDING`, y dispara `verify_payment` (Celery). Esta tarea simula un retardo y aprueba el pago con 80% de probabilidad (`random.random()`), para poder observar ambos flujos (`CONFIRMED` y `FAILED`) sin depender de un proveedor de pagos real. Si aprueba, descuenta el stock dentro de una transacción con `select_for_update()` sobre los productos (revalidando que el stock siga alcanzando, para evitar sobreventa entre pedidos concurrentes) y dispara `send_notification`. Cualquier error inesperado durante la confirmación deja el pedido en `FAILED` en vez de `PENDING` colgado.

`GET /api/orders/` y `GET /api/orders/{id}/` solo devuelven los pedidos del usuario autenticado; el listado admite `?status=PENDING|CONFIRMED|FAILED`.

## Decisiones de diseño

_Pendiente — se documentará al cerrar el proyecto._
