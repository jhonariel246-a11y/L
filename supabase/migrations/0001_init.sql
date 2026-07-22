-- ============================================================================
-- InsightPay — Esquema inicial (multi-tenant con Row Level Security)
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- Cada negocio (business) pertenece a un usuario de Supabase Auth (owner_id).
-- Las políticas RLS garantizan que un negocio SOLO ve/edita SUS datos.
-- ============================================================================

-- 1) NEGOCIOS (tenants) -------------------------------------------------------
create table if not exists public.businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  type         text,
  ruc          text,
  address      text,
  phone        text,
  plan         text default 'Restaurante',
  invoice_seq  integer not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_businesses_owner on public.businesses(owner_id);

-- 2) MENÚ / INVENTARIO --------------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  category     text,
  price        numeric(10,2) not null default 0,
  stock        integer not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_menu_business on public.menu_items(business_id);

-- 3) MESAS --------------------------------------------------------------------
create table if not exists public.restaurant_tables (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  num          integer,
  name         text,
  type         text default 'mesa',       -- 'mesa' | 'togo'
  status       text default 'free',        -- 'free' | 'busy'
  lines        jsonb default '[]'::jsonb,
  updated_at   timestamptz default now()
);
create index if not exists idx_tables_business on public.restaurant_tables(business_id);

-- 4) FACTURAS -----------------------------------------------------------------
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  number            text,
  origin            text,
  client            jsonb,
  pay               text,
  lines             jsonb,
  subtotal          numeric(10,2),
  iva               numeric(10,2),
  total             numeric(10,2),
  sri_estado        text default 'NO_AUTORIZADA',   -- FIRMADO | AUTORIZADO | NO_AUTORIZADO...
  sri_autorizacion  text,
  clave_acceso      text,
  created_at        timestamptz default now()
);
create index if not exists idx_invoices_business on public.invoices(business_id);

-- 5) COBROS: socios y pagos ---------------------------------------------------
create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  name             text not null,
  plan             text,
  amount           numeric(10,2) not null default 0,
  day              integer,
  phone            text,
  last_paid_month  text,                    -- 'YYYY-MM'
  created_at       timestamptz default now()
);
create index if not exists idx_members_business on public.members(business_id);

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  member_id    uuid references public.members(id) on delete set null,
  member_name  text,
  concept      text,
  amount       numeric(10,2) not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_payments_business on public.payments(business_id);

-- 6) NÓMINA -------------------------------------------------------------------
create table if not exists public.employees (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  role         text,
  salary       numeric(10,2) not null default 0,
  start_date   date,
  created_at   timestamptz default now()
);
create index if not exists idx_employees_business on public.employees(business_id);

-- 7) TRIBUTARIO ---------------------------------------------------------------
create table if not exists public.tax_docs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  type         text not null,              -- 'venta' | 'compra'
  description  text,
  base         numeric(10,2) not null default 0,
  iva          numeric(10,2) not null default 0,
  total        numeric(10,2) not null default 0,
  doc_date     date,
  created_at   timestamptz default now()
);
create index if not exists idx_taxdocs_business on public.tax_docs(business_id);

-- 8) CERTIFICADO (solo METADATOS; el .p12 cifrado vive en el backend) --------
create table if not exists public.billing_certificates (
  business_id  uuid primary key references public.businesses(id) on delete cascade,
  ruc          text,
  razon_social text,
  activo       boolean default false,
  valid_until  timestamptz,
  updated_at   timestamptz default now()
);

-- RPC: siguiente secuencial de factura (atómico, respeta RLS) -----------------
create or replace function public.next_invoice_seq(p_business uuid)
returns integer
language sql
security invoker
as $$
  update public.businesses
     set invoice_seq = invoice_seq + 1
   where id = p_business and owner_id = auth.uid()
  returning invoice_seq;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY  (el corazón de la seguridad multi-tenant)
-- ============================================================================
alter table public.businesses            enable row level security;
alter table public.menu_items            enable row level security;
alter table public.restaurant_tables     enable row level security;
alter table public.invoices              enable row level security;
alter table public.members               enable row level security;
alter table public.payments              enable row level security;
alter table public.employees             enable row level security;
alter table public.tax_docs              enable row level security;
alter table public.billing_certificates  enable row level security;

-- Un negocio es "mío" si owner_id = auth.uid()
drop policy if exists "own business" on public.businesses;
create policy "own business" on public.businesses
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Para el resto de tablas: solo filas de un negocio que me pertenece
do $$
declare t text;
begin
  foreach t in array array[
    'menu_items','restaurant_tables','invoices','members',
    'payments','employees','tax_docs','billing_certificates'
  ] loop
    execute format('drop policy if exists "own business data" on public.%I;', t);
    execute format($f$
      create policy "own business data" on public.%I
        for all
        using (business_id in (select id from public.businesses where owner_id = auth.uid()))
        with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
    $f$, t);
  end loop;
end $$;

-- ============================================================================
-- Fin del esquema inicial de InsightPay.
-- ============================================================================
