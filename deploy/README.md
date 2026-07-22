# InsightPay — Desplegar TODO en tu servidor (Camino A)

Frontend + backend + base de datos PostgreSQL, todo en tu VPS con Docker.

## Requisito
Un **VPS / servidor con acceso root (SSH)** — p. ej. DigitalOcean, Contabo,
Hostinger **VPS**, AWS EC2. **No sirve un hosting compartido (cPanel)**: ese no
corre Node ni Postgres.

## Pasos (en el servidor)

```bash
# 1. Instalar Docker (una sola vez)
curl -fsSL https://get.docker.com | sh

# 2. Traer el código
git clone <tu-repo> insightpay && cd insightpay

# 3. Configurar los secretos
cp deploy/.env.example deploy/.env
nano deploy/.env
#   - DB_PASSWORD: una clave larga
#   - INSIGHTPAY_MASTER_KEY:  openssl rand -hex 32
#   - JWT_SECRET:             openssl rand -hex 48
#   - CORS_ORIGIN: https://insightpay.lat

# 4. Levantar todo (BD + backend + web)
docker compose -f deploy/docker-compose.yml up -d --build

# 5. Ver que corre
docker compose -f deploy/docker-compose.yml ps
curl http://localhost:3000/api/health
```

La base de datos aplica el esquema (`server/db/schema.sql`) automáticamente la
primera vez que arranca.

## HTTPS + dominio
Poner un **Caddy** o **nginx** delante para HTTPS y apuntar `insightpay.lat` al
servidor. Ejemplo con Caddy (HTTPS automático):

```
insightpay.lat {
    reverse_proxy localhost:3000
}
```

## Respaldos de la base de datos
```bash
docker compose -f deploy/docker-compose.yml exec db \
  pg_dump -U insightpay insightpay > backup_$(date +%F).sql
```

## Estado
- ✅ Infraestructura de despliegue (Docker: Postgres + backend + web) y esquema.
- ⏳ Pendiente (siguiente): conectar el backend a Postgres y la autenticación
  por JWT (hoy el backend usa almacenamiento local para certificados y aún no
  persiste los datos de la app en Postgres). Es el mismo trabajo de integración
  que aplica tanto para self-host como para Supabase.
