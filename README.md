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

## Decisiones de diseño

_Pendiente — se documentará a medida que avance el desarrollo._
