# TiendaExpress OMS

Sistema de gestión de pedidos (OMS) para un e-commerce: valida stock, verifica el pago de forma asíncrona con Celery y confirma o rechaza el pedido según el resultado. Backend en Django + DRF + Celery/RabbitMQ + PostgreSQL, frontend en React (Vite) con autenticación JWT.

## Requisitos previos

- Docker y Docker Compose
- Node.js (para correr el frontend fuera de Docker)

## Cómo levantar el proyecto

1. Clonar el repositorio
2. Copiar `.env.example` a `.env`
3. `docker-compose up --build`
4. En otra terminal, aplicar migraciones y cargar el seed:
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py seed_data
   ```
5. Levantar el frontend:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
6. URLs disponibles:
   - Backend: http://localhost:8000
   - Panel de RabbitMQ: http://localhost:15672
   - Frontend: http://localhost:5173

`seed_data` crea un usuario de prueba y 5 productos con distinto stock.

## Credenciales de prueba

- Email: `demo@tiendaexpress.com`
- Password: `Demo12345!`

## Flujo de pedidos

`POST /api/orders/` valida stock y crea el pedido en `PENDING`, disparando la tarea Celery `verify_payment`. Esta simula un retardo y aprueba el pago con 80% de probabilidad; si aprueba, descuenta el stock dentro de una transacción con `select_for_update()` (revalidando para evitar sobreventa entre pedidos concurrentes) y marca el pedido `CONFIRMED`; si no, lo marca `FAILED` sin tocar el stock.

## Decisiones de diseño

- **Monorepo con `backend/` y `frontend/` separados.** Permite levantar todo con un solo `docker-compose up` desde la raíz sin coordinar dos repositorios, algo razonable para una prueba take-home.
- **Apps Django separadas (`users`, `products`, `orders`).** Cada una con una sola responsabilidad, evitando el modelo "todo en una app" que se vuelve difícil de mantener a medida que el proyecto crece.
- **`CustomUser` con `email` como identificador.** El MER del enunciado usa `email`, no `username`. Partir de `AbstractBaseUser` desde el inicio evita tener que migrar el modelo de usuario más adelante, algo costoso en Django.
- **Tarea Celery con 80% de probabilidad de éxito (`random.random()`).** Permite observar ambos flujos (`CONFIRMED` y `FAILED`) en pruebas reales sin depender de un proveedor de pagos externo. Una regla determinística (por ejemplo, par/impar de ID) sería más predecible, pero menos representativa de un entorno real.
- **`select_for_update()` con `order_by('id')` al descontar stock.** El orden es intencional: cuando dos transacciones necesitan bloquear varios productos, hacerlo siempre en el mismo orden previene deadlocks (sin esto, una transacción podría bloquear el producto 1 esperando el 2 mientras otra bloquea el 2 esperando el 1).
- **`transaction.on_commit()` para disparar la tarea Celery.** Si se disparara dentro del bloque `atomic()`, el worker podría llegar a leer el pedido antes de que la transacción se confirmara en la base de datos. Con `on_commit()`, la tarea se encola recién cuando el commit ya ocurrió.
- **Polling en el frontend con `setInterval`.** El enunciado pedía reflejar el cambio de estado sin recargar. WebSockets sería la solución ideal en producción, pero agrega infraestructura (Django Channels, un channel layer sobre Redis) que excede el alcance de una prueba de 8 horas. El polling cada pocos segundos cubre el requerimiento con una complejidad razonable.
- **`IsAuthenticated` como permiso por defecto (`DEFAULT_PERMISSION_CLASSES`).** Protege todos los endpoints globalmente, evitando el riesgo de aplicar el permiso vista por vista y olvidarse de alguna.

## Qué haría distinto con más tiempo

- Tests unitarios con `pytest` para la lógica de estados de `verify_payment`
- WebSockets (Django Channels) en lugar de polling para el cambio de estado en tiempo real
- Dockerizar también el frontend para levantar todo con un solo `docker-compose up`
- Paginación en el listado de pedidos del frontend

## Puntos extra implementados

- Docker Compose funcional de punta a punta
- Manejo de concurrencia con `select_for_update()` y `order_by('id')` para prevenir deadlocks
- Polling en el frontend para reflejar el cambio de estado sin recargar
