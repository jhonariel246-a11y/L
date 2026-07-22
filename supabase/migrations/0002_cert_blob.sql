-- ============================================================================
-- InsightPay — guardar el certificado .p12 CIFRADO en la base (no en disco,
-- porque las funciones serverless de Netlify no tienen almacenamiento propio).
-- Ejecutar en el SQL Editor de Supabase después de 0001_init.sql.
-- ============================================================================

alter table public.billing_certificates
  add column if not exists p12_encrypted text;   -- blob AES-256-GCM en base64

-- El .p12 solo lo lee/escribe el backend con la service_role key.
-- Bloqueamos el acceso del cliente (anon) a esta columna sensible negando la
-- tabla a nivel de RLS para roles no-servicio (ya está con RLS por 0001).
