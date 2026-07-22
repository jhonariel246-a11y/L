# InsightPay · Backend serverless (Netlify Functions)

La función `api.js` maneja lo que NO puede vivir en el navegador: firmar
comprobantes con el `.p12` y hablar con el SRI. Reutiliza el motor de
`server/sri/` (ya probado).

## Rutas
| Método | Ruta | Qué hace |
|---|---|---|
| GET  | `/api/facturacion/estado`  | ¿el negocio ya activó facturación? |
| POST | `/api/facturacion/activar` | sube el `.p12` → se guarda **cifrado en Supabase** |
| POST | `/api/facturas`            | firma con el cert guardado + envía al SRI |

Autenticación: el frontend manda el **JWT de Supabase** (`Authorization: Bearer`).
La función lo verifica y ubica el negocio del usuario.

## Variables de entorno (Netlify → Site settings → Environment variables)

| Variable | Valor | Secreto |
|---|---|---|
| `SUPABASE_URL` | `https://niecvhyfplqzusitxjvk.supabase.co` | no |
| `SUPABASE_SERVICE_ROLE_KEY` | (Supabase → Project Settings → API → service_role) | **SÍ** |
| `INSIGHTPAY_MASTER_KEY` | `openssl rand -hex 32` | **SÍ** |

> La `service_role key` y la `INSIGHTPAY_MASTER_KEY` se ponen **solo en Netlify**
> (en el panel), **nunca** en el repo ni en el chat.

## Certificado `.p12`
- Se cifra con **AES-256-GCM** (clave `INSIGHTPAY_MASTER_KEY`) junto con su
  contraseña, y se guarda en la columna `p12_encrypted` de
  `billing_certificates` en Supabase.
- Solo el backend (service_role) lo lee; el cliente (anon) no puede.

## Pendiente para funcionar de punta a punta
El frontend debe autenticarse con **Supabase Auth** para obtener el JWT que esta
función espera. Esa integración (login/registro con Supabase + datos de los
módulos en la nube) es el siguiente paso.
