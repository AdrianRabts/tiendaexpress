# TiendaExpress OMS

Sistema de gestión de pedidos (OMS) para un e-commerce: valida stock, verifica el pago de forma asíncrona con Celery y confirma o rechaza el pedido según el resultado.

**Stack:** Django, DRF, Celery, RabbitMQ, Channels (WebSockets), Redis, PostgreSQL · React (Vite), Axios, JWT

## Requisitos previos

- Docker y Docker Compose
- Node.js (opcional, solo si preferís correr el frontend fuera de Docker)

## Cómo levantar el proyecto

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` (raíz y `frontend/`)
3. `docker-compose up --build`
4. En otra terminal, aplicar migraciones y cargar el seed:
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py seed_data
   ```

| Servicio  | URL                          |
| --------- | ---------------------------- |
| Backend   | http://localhost:8000        |
| RabbitMQ  | http://localhost:15672       |
| Frontend  | http://localhost:5173        |

`seed_data` crea un usuario de prueba y 5 productos con distinto stock. El `docker-compose up` levanta los cinco servicios de backend (db, rabbitmq, redis, web, worker) más el frontend; si preferís correr el frontend fuera de Docker (hot-reload nativo), `cd frontend && npm install && npm run dev`.

## Credenciales de prueba

- Email: `demo@tiendaexpress.com`
- Password: `Demo12345!`

## Endpoints principales

| Método | Ruta                    | Descripción                                  |
| ------ | ------------------------ | --------------------------------------------- |
| POST   | `/api/auth/login/`       | Obtiene `access` y `refresh`                  |
| POST   | `/api/auth/refresh/`     | Renueva el `access`                            |
| GET    | `/api/products/`         | Listado paginado de productos                 |
| POST   | `/api/orders/`           | Crea un pedido, valida stock                   |
| GET    | `/api/orders/`           | Lista los pedidos del usuario, filtra por `status` |
| GET    | `/api/orders/{id}/`      | Detalle de un pedido con sus ítems              |
| WS     | `/ws/orders/?token=<access>` | Notifica cambios de estado de los pedidos del usuario en tiempo real |

## Flujo de pedidos

`POST /api/orders/` valida stock y crea el pedido en `PENDING`, disparando la tarea Celery `verify_payment`. Esta simula un retardo y aprueba el pago con 80% de probabilidad; si aprueba, descuenta el stock dentro de una transacción con `select_for_update()` (revalidando para evitar sobreventa entre pedidos concurrentes) y marca el pedido `CONFIRMED`; si no, lo marca `FAILED` sin tocar el stock. En cada transición se notifica por WebSocket al grupo del usuario dueño del pedido, para que el frontend refleje el cambio sin recargar ni hacer polling.

## Tests

```bash
docker-compose exec web pytest      # backend
cd frontend && npm test             # frontend
```

El backend cubre las transiciones de estado de `verify_payment` (confirmado, fallo de pago, fallo por stock insuficiente en la revalidación, fallo por error inesperado), la validación de stock en `POST /api/orders/`, el manager de `CustomUser`, y el listado/autenticación de `products`. El frontend cubre el interceptor de Axios: adjunta el token, refresca una vez ante un 401 y reintenta, y limpia la sesión si el refresh también falla.

## Decisiones de diseño

- **Monorepo con `backend/` y `frontend/` separados.** Permite levantar todo con un solo `docker-compose up` desde la raíz sin coordinar dos repositorios, algo razonable para una prueba take-home.
- **Apps Django separadas (`users`, `products`, `orders`).** Cada una con una sola responsabilidad, evitando el modelo "todo en una app" que se vuelve difícil de mantener a medida que el proyecto crece.
- **`CustomUser` con `email` como identificador.** El MER del enunciado usa `email`, no `username`. Partir de `AbstractBaseUser` desde el inicio evita tener que migrar el modelo de usuario más adelante, algo costoso en Django.
- **Tarea Celery con 80% de probabilidad de éxito (`random.random()`).** Permite observar ambos flujos (`CONFIRMED` y `FAILED`) en pruebas reales sin depender de un proveedor de pagos externo. Una regla determinística (por ejemplo, par/impar de ID) sería más predecible, pero menos representativa de un entorno real.
- **`select_for_update()` con `order_by('id')` al descontar stock.** El orden es intencional: cuando dos transacciones necesitan bloquear varios productos, hacerlo siempre en el mismo orden previene deadlocks (sin esto, una transacción podría bloquear el producto 1 esperando el 2 mientras otra bloquea el 2 esperando el 1).
- **`transaction.on_commit()` para disparar la tarea Celery.** Si se disparara dentro del bloque `atomic()`, el worker podría llegar a leer el pedido antes de que la transacción se confirmara en la base de datos. Con `on_commit()`, la tarea se encola recién cuando el commit ya ocurrió.
- **WebSockets con Django Channels + Redis en vez de polling.** El enunciado pedía reflejar el cambio de estado sin recargar. `verify_payment` notifica al grupo del usuario (`orders_user_<id>`) cuando el pedido cambia de estado; el frontend abre un solo socket por sesión en vez de reconsultar la API cada pocos segundos. La autenticación del WebSocket usa el mismo `access` token de JWT, pasado como query param en el handshake (un middleware propio lo valida y arma `scope['user']`, ya que Channels no entiende de SimpleJWT por defecto).
- **`IsAuthenticated` como permiso por defecto (`DEFAULT_PERMISSION_CLASSES`).** Protege todos los endpoints globalmente, evitando el riesgo de aplicar el permiso vista por vista y olvidarse de alguna.

## Qué haría distinto con más tiempo

- Reconectar el WebSocket automáticamente si el `access` expira a mitad de sesión (hoy se abre una sola vez al entrar a `/orders`)
- Tests end-to-end del flujo completo (crear pedido → confirmar/fallar → verlo en el frontend) con Playwright

## Puntos extra implementados

- Docker Compose funcional de punta a punta, incluyendo el frontend
- Manejo de concurrencia con `select_for_update()` y `order_by('id')` para prevenir deadlocks
- WebSockets (Django Channels + Redis) en vez de polling para reflejar el cambio de estado en tiempo real
- Paginación en el listado de pedidos del frontend
- Tests unitarios con `pytest` (estados de `verify_payment`, validación de stock, manager de `CustomUser`, listado de `products`) y con `vitest` (interceptor de JWT del frontend)
