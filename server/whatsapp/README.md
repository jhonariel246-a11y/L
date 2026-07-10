# InsightPay · Bot de WhatsApp (WhatsApp Business Cloud API)

Bot que atiende los pedidos para llevar de cada local: saluda, envía el menú,
toma la orden, la confirma y la deja en el buzón del local (para que el POS la
muestre).

## Archivos
- `bot.js` — motor de conversación (máquina de estados). **Probado.**
- `cloud-api.js` — envío de mensajes y lectura de payloads de Meta.
- `handler.js` — orquestador: resuelve el local por su número, corre el bot,
  envía respuestas y guarda el pedido.
- `test.js` — conversación completa simulada. **Pasa.**

## Endpoints (en `server/index.js`)
- `GET  /webhook/whatsapp` — verificación del webhook (Meta lo llama al configurar).
- `POST /webhook/whatsapp` — recepción de mensajes entrantes.
- `GET  /api/whatsapp/pedidos?tenant=` — pedidos que llegaron al local.

## Qué se necesita para conectarlo EN VIVO (lo que hay que conseguir)

1. **Cuenta de Meta Business** + una **App** en developers.facebook.com con el
   producto *WhatsApp* agregado.
2. Un **número** dado de alta en WhatsApp Business Platform. De ahí se obtienen:
   - `phone_number_id`  (id del número)
   - **access token** (permanente, de sistema) → **SECRETO**
   - `WHATSAPP_VERIFY_TOKEN` → lo elegimos nosotros (ej. `insightpay-verify`)
3. Configurar en Meta el webhook apuntando a:
   `https://insightpay.lat/webhook/whatsapp` (requiere el backend desplegado y HTTPS).
4. Registrar el local en el sistema: mapear `phone_number_id → tenant + menú`.
   (Hoy en memoria con `registrarLocal()`; se moverá a Supabase.)

## Variables de entorno del servidor (no van en el código)
```
WHATSAPP_VERIFY_TOKEN=insightpay-verify
# el access token por local se guarda cifrado / en config del local
```

## Dependencia importante
El bot corre en la nube, pero el **menú de cada local vive en su computadora**
(local-first). Para que el bot sepa qué menú enviar, el menú debe estar
**sincronizado a la nube (Supabase)**. Por eso el bot de WhatsApp y la
sincronización a Supabase van juntos.

## Estado
- Lógica del bot y webhook: **construidos y probados** con mensajes simulados.
- Envío real y recepción real: requieren las **credenciales de Meta** + el
  **backend desplegado con HTTPS** (hosting) + el **menú en la nube**.
