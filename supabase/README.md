# InsightPay · Supabase (nube + autenticación)

Supabase cumple dos funciones críticas:
1. **Autenticación real** (Supabase Auth / JWT) → cierra el hueco de seguridad:
   cada negocio solo accede a SUS datos, verificado en la base con RLS.
2. **Sincronización a la nube** → los datos dejan de vivir solo en la compu del
   local; se respaldan y se pueden ver desde otro lado.

## Cómo aplicar el esquema (2 minutos, sin contraseña)

1. Entra a tu proyecto: https://niecvhyfplqzusitxjvk.supabase.co
2. Menú lateral → **SQL Editor** → **New query**.
3. Copia TODO el contenido de `migrations/0001_init.sql` y pégalo.
4. Pulsa **Run**. Debe decir *Success*.

Eso crea todas las tablas (negocios, menú, mesas, facturas, socios, pagos,
empleados, tributario, certificados) **con Row Level Security activado**.

## Datos de conexión

| Dato | Valor | Dónde va |
|---|---|---|
| URL del proyecto | `https://niecvhyfplqzusitxjvk.supabase.co` | público (frontend) |
| Publishable / anon key | `sb_publishable_...` | público (frontend, en `assets/config.js`) |
| **Contraseña de la BD** | (secreta) | **rotarla** — se filtró en el chat |
| **service_role key** | (secreta) | solo variables de entorno del backend, NUNCA en el repo |

> ⚠️ **Rota la contraseña de la base de datos** en
> *Project Settings → Database → Reset database password*. La que se pegó en el
> chat quedó comprometida.

## Seguridad (RLS)

- `businesses`: una fila por negocio, con `owner_id = auth.uid()`.
- Todas las demás tablas: política que solo permite filas cuyo `business_id`
  pertenece a un negocio del usuario autenticado.
- Resultado: aunque alguien tenga la anon key (es pública), **no puede leer ni
  escribir datos de otro negocio**. La base lo impide.

## Qué sigue (implementación en la app)

1. **Auth**: cambiar el login local (IndexedDB) por **Supabase Auth**
   (registro/login con correo). El negocio se crea en `businesses` tras el alta.
2. **Sync**: el modo local-first se mantiene (funciona offline); cuando hay
   internet, la cola de cambios sube a Supabase y baja lo nuevo.
3. **Backend**: los endpoints de facturación pasan a **verificar el JWT de
   Supabase** (en vez de confiar en el `tenant` del body) → cierra el crítico
   de autenticación de la API.
4. **service_role** solo en el backend (variable de entorno) para operaciones
   administrativas.
