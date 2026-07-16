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

## Decisiones de diseño

_Pendiente — se documentará a medida que avance el desarrollo._
