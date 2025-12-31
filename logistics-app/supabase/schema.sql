create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  role text not null check (role in ('admin', 'staff', 'driver', 'relay')),
  address text,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  sender_name text,
  sender_phone text,
  sender_address text,
  sender_id_number text,
  receiver_name text,
  receiver_phone text,
  receiver_address text,
  destination_country text,
  weight_kg numeric(10,2),
  pricing_tier text,
  service_level text not null default 'STANDARD' check (service_level in ('STANDARD', 'EXPRESS')),
  status text not null default 'CREATED' check (status in ('CREATED', 'RECEIVED', 'IN_TRANSIT', 'AT_RELAY_AVAILABLE', 'DELIVERED', 'CANCELLED')),
  payment_terms text,
  base_price numeric(10,2),
  final_price numeric(10,2),
  received_at timestamptz,
  expected_delivery_at timestamptz,
  worst_case_delivery_at timestamptz,
  created_by uuid references public.users(id),
  assigned_driver_id uuid references public.users(id),
  assigned_relay_id uuid references public.users(id),
  current_handler_id uuid references public.users(id),
  current_handler_location text,
  id_photo_url text,
  parcel_photo_url text,
  receiver_id_photo_url text,
  receiver_parcel_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipments_tracking_idx on public.shipments (tracking_code);
create index if not exists shipments_driver_idx on public.shipments (assigned_driver_id);
create index if not exists shipments_relay_idx on public.shipments (assigned_relay_id);

alter table public.users enable row level security;
alter table public.shipments enable row level security;

create policy "Allow anon user read" on public.users
  for select using (true);

create policy "Allow anon user insert" on public.users
  for insert with check (true);

create policy "Allow anon user update" on public.users
  for update using (true);

create policy "Allow anon shipment read" on public.shipments
  for select using (true);

create policy "Allow anon shipment write" on public.shipments
  for insert with check (true);

create policy "Allow anon shipment update" on public.shipments
  for update using (true);

create policy "Allow auth shipment delete" on public.shipments
  for delete using (auth.role() = 'authenticated');
