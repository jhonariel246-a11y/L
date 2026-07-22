-- ============================================================================
-- InsightPay — Esquema PostgreSQL para SELF-HOSTING (Camino A)
-- La autenticación la maneja el backend (JWT); el aislamiento entre negocios
-- se aplica en el backend (cada consulta se limita al business del token).
-- Se aplica automáticamente la primera vez que arranca el contenedor de la BD.
-- ============================================================================

-- Cuentas (login) ------------------------------------------------------------
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  salt          text not null,
  created_at    timestamptz default now()
);

-- Negocios (tenants) ---------------------------------------------------------
create table if not exists businesses (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  name         text not null,
  type         text,
  ruc          text,
  address      text,
  phone        text,
  plan         text default 'Restaurante',
  invoice_seq  integer not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_businesses_account on businesses(account_id);

-- Menú / inventario ----------------------------------------------------------
create table if not exists menu_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  category     text,
  price        numeric(10,2) not null default 0,
  stock        integer not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_menu_business on menu_items(business_id);

-- Mesas ----------------------------------------------------------------------
create table if not exists restaurant_tables (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  num          integer,
  name         text,
  type         text default 'mesa',
  status       text default 'free',
  lines        jsonb default '[]'::jsonb,
  updated_at   timestamptz default now()
);
create index if not exists idx_tables_business on restaurant_tables(business_id);

-- Facturas -------------------------------------------------------------------
create table if not exists invoices (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  number            text,
  origin            text,
  client            jsonb,
  pay               text,
  lines             jsonb,
  subtotal          numeric(10,2),
  iva               numeric(10,2),
  total             numeric(10,2),
  sri_estado        text default 'NO_AUTORIZADA',
  sri_autorizacion  text,
  clave_acceso      text,
  created_at        timestamptz default now()
);
create index if not exists idx_invoices_business on invoices(business_id);

-- Cobros ---------------------------------------------------------------------
create table if not exists members (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text not null,
  plan             text,
  amount           numeric(10,2) not null default 0,
  day              integer,
  phone            text,
  last_paid_month  text,
  created_at       timestamptz default now()
);
create index if not exists idx_members_business on members(business_id);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  member_id    uuid references members(id) on delete set null,
  member_name  text,
  concept      text,
  amount       numeric(10,2) not null default 0,
  created_at   timestamptz default now()
);
create index if not exists idx_payments_business on payments(business_id);

-- Nómina ---------------------------------------------------------------------
create table if not exists employees (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  role         text,
  salary       numeric(10,2) not null default 0,
  start_date   date,
  created_at   timestamptz default now()
);
create index if not exists idx_employees_business on employees(business_id);

-- Tributario -----------------------------------------------------------------
create table if not exists tax_docs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  type         text not null,
  description  text,
  base         numeric(10,2) not null default 0,
  iva          numeric(10,2) not null default 0,
  total        numeric(10,2) not null default 0,
  doc_date     date,
  created_at   timestamptz default now()
);
create index if not exists idx_taxdocs_business on tax_docs(business_id);

-- Certificado (metadatos; el .p12 cifrado vive en el volumen del backend) -----
create table if not exists billing_certificates (
  business_id  uuid primary key references businesses(id) on delete cascade,
  ruc          text,
  razon_social text,
  activo       boolean default false,
  valid_until  timestamptz,
  updated_at   timestamptz default now()
);
