# TiendaExpress OMS

Sistema de gestión de pedidos (OMS) para un e-commerce: valida stock, verifica el pago de forma asíncrona con Celery y confirma o rechaza el pedido según el resultado.

**Stack:** Django, DRF, Celery, RabbitMQ, Channels (WebSockets), Redis, PostgreSQL · React (Vite), Axios, JWT

## Requisitos previos

- Docker y Docker Compose
- Node.js (opcional, solo si quieres correr el frontend fuera de Docker)

## Cómo levantar el proyecto

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` (en la raíz y en `frontend/`)
3. Levantar los servicios:
   ```bash
   docker-compose up --build
   ```
4. En otra terminal, aplicar migraciones y cargar el seed:
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py seed_data
   ```

| Servicio  | URL                     |
| --------- | ----------------------- |
| Backend   | http://localhost:8000   |
| RabbitMQ  | http://localhost:15672  |
| Frontend  | http://localhost:5173   |

`docker-compose up` levanta los cinco servicios de backend (db, rabbitmq, redis, web, worker) más el frontend. `seed_data` crea un usuario de prueba y 5 productos con distinto stock.

Si prefieres correr el frontend fuera de Docker (hot-reload nativo):
```bash
cd frontend && npm install && npm run dev
```

## Credenciales de prueba

- Email: `demo@tiendaexpress.com`
- Password: `Demo12345!`

## Endpoints principales

| Método | Ruta                          | Descripción                                    |
| ------ | ----------------------------- | ----------------------------------------------- |
| POST   | `/api/auth/login/`            | Obtiene `access` y `refresh`                    |
| POST   | `/api/auth/refresh/`          | Renueva el `access`                             |
| GET    | `/api/products/`              | Listado paginado de productos                   |
| POST   | `/api/orders/`                | Crea un pedido, valida stock                     |
| GET    | `/api/orders/`                | Lista los pedidos del usuario, filtra por `status` |
| GET    | `/api/orders/{id}/`           | Detalle de un pedido con sus ítems                |
| WS     | `/ws/orders/?token=<access>`  | Notifica cambios de estado en tiempo real         |

## Flujo de pedidos

`POST /api/orders/` valida stock y crea el pedido en `PENDING`, disparando la tarea Celery `verify_payment`. Esta simula un retardo y aprueba el pago con 80% de probabilidad. Si aprueba, descuenta el stock dentro de una transacción con `select_for_update()` (revalidando para evitar sobreventa entre pedidos concurrentes) y marca el pedido `CONFIRMED`. Si no, lo marca `FAILED` sin tocar el stock. Cada transición se notifica por WebSocket al usuario dueño del pedido, para que el frontend refleje el cambio sin recargar ni hacer polling.

## Tests

```bash
docker-compose exec web pytest      # backend
cd frontend && npm test             # frontend
```

Backend: transiciones de estado de `verify_payment`, validación de stock en `POST /api/orders/`, manager de `CustomUser`, listado y autenticación de `products`. Frontend: interceptor de Axios (adjunta el token, refresca ante un 401 y reintenta, limpia la sesión si el refresh también falla).

## Decisiones de diseño

- **Monorepo (`backend/` + `frontend/`).** Un solo `docker-compose up` levanta todo, sin coordinar dos repositorios.
- **Apps Django separadas (`users`, `products`, `orders`).** Cada una con una sola responsabilidad.
- **`CustomUser` con `email` como identificador.** El MER del enunciado usa `email`, no `username`; partir de `AbstractBaseUser` desde el inicio evita migrar el modelo de usuario más adelante.
- **80% de probabilidad de éxito en el pago (`random.random()`).** Permite ver ambos flujos (`CONFIRMED` y `FAILED`) en pruebas reales sin depender de un proveedor de pagos externo.
- **`select_for_update()` con `order_by('id')` al descontar stock.** El orden es intencional: bloquear los productos siempre en el mismo orden entre transacciones concurrentes evita deadlocks.
- **`transaction.on_commit()` para disparar la tarea Celery.** Si se disparara dentro del `atomic()`, el worker podría leer el pedido antes de que la transacción se confirme en la base de datos.
- **WebSockets (Django Channels + Redis) en vez de polling.** `verify_payment` notifica al grupo del usuario cuando el pedido cambia de estado. La autenticación del WebSocket usa el mismo `access` token, pasado como query param en el handshake (Channels no entiende de JWT por defecto, de ahí el middleware propio).
- **`IsAuthenticated` por defecto (`DEFAULT_PERMISSION_CLASSES`).** Protege todos los endpoints globalmente, en vez de aplicar el permiso vista por vista.

## Ideas para un posible escalado

- Reconexión automática del WebSocket si el `access` expira a mitad de sesión
- Tests end-to-end del flujo completo (crear pedido → confirmar/fallar → verlo en el frontend) con Playwright
- Cache de lectura para `GET /api/products/` si el catálogo crece
- WebSockets en un servicio dedicado (Daphne detrás de un load balancer) si el tráfico concurrente aumenta

## Puntos extra implementados

- Docker Compose funcional de punta a punta, incluyendo el frontend
- Manejo de concurrencia con `select_for_update()` y `order_by('id')` para prevenir deadlocks
- WebSockets (Django Channels + Redis) en vez de polling
- Paginación en el listado de pedidos del frontend
- Tests con `pytest` (backend) y `vitest` (interceptor de JWT del frontend)
