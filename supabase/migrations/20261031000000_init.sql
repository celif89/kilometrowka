-- Kilometrówka – schemat bazy Supabase.
-- Uruchom raz w Supabase: SQL Editor → New query → wklej całość → Run.
--
-- Wszystkie tabele mają przedrostek km_, więc schemat można wgrać do tego samego
-- projektu co FV Meter (nic się nie nadpisze, a codzienna synchronizacja FV Meter
-- nie pozwoli darmowemu projektowi zasnąć).
--
-- Dostęp: aplikacja ma jednego właściciela. Pierwsze zalogowane konto wywołuje
-- km_claim_ownership() i od tej chwili tylko ono widzi i zmienia dane (RLS).

-- ---------------------------------------------------------------------------
-- Właściciel
-- ---------------------------------------------------------------------------
create table if not exists public.km_owner (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create or replace function public.km_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.km_owner where user_id = auth.uid());
$$;

create or replace function public.km_claim_ownership()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return false;
    end if;
    lock table public.km_owner in exclusive mode;
    if not exists (select 1 from public.km_owner) then
        insert into public.km_owner (user_id) values (auth.uid());
    end if;
    return public.km_is_owner();
end;
$$;

revoke all on function public.km_claim_ownership() from public, anon;
grant execute on function public.km_claim_ownership() to authenticated;
grant execute on function public.km_is_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Dane
-- ---------------------------------------------------------------------------
-- Pojazdy objęte ewidencją (art. 86a ust. 7 ustawy o VAT).
create table if not exists public.km_vehicles (
    id bigint generated always as identity primary key,
    name text not null,
    plate text not null,
    start_date date not null,
    start_odometer double precision not null default 0 check (start_odometer >= 0),
    end_date date,
    default_driver text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Stałe trasy – jednym kliknięciem dodają przejazd.
create table if not exists public.km_routes (
    id bigint generated always as identity primary key,
    name text,
    purpose text not null,
    origin text not null,
    destination text not null,
    km double precision not null check (km > 0),
    color text,
    position integer not null default 0,
    archived boolean not null default false,
    created_at timestamptz not null default now()
);

-- Szablony dnia – kilka stałych tras dodawanych naraz (np. dom → biuro → dom).
create table if not exists public.km_templates (
    id bigint generated always as identity primary key,
    name text not null,
    route_ids bigint[] not null default '{}',
    position integer not null default 0,
    created_at timestamptz not null default now()
);

-- Wpisy ewidencji. seq = kolejność przejazdu w danym dniu.
create table if not exists public.km_trips (
    id bigint generated always as identity primary key,
    vehicle_id bigint not null references public.km_vehicles (id) on delete cascade,
    day date not null,
    seq integer not null default 0,
    purpose text not null,
    origin text not null,
    destination text not null,
    km double precision not null check (km > 0),
    driver text not null,
    route_id bigint references public.km_routes (id) on delete set null,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists km_trips_vehicle_day on public.km_trips (vehicle_id, day, seq, id);

-- Faktyczne odczyty licznika (np. z aplikacji auta, przeglądu) – do kontroli zgodności.
create table if not exists public.km_odometer (
    id bigint generated always as identity primary key,
    vehicle_id bigint not null references public.km_vehicles (id) on delete cascade,
    day date not null,
    km double precision not null check (km >= 0),
    note text
);
create index if not exists km_odometer_vehicle_day on public.km_odometer (vehicle_id, day);

-- Zatwierdzone (podpisane) miesiące – w aplikacji nie można ich już zmieniać.
create table if not exists public.km_month_close (
    vehicle_id bigint not null references public.km_vehicles (id) on delete cascade,
    month text not null check (month ~ '^\d{4}-\d{2}$'),
    closed_at timestamptz not null default now(),
    primary key (vehicle_id, month)
);

create table if not exists public.km_settings (
    key text primary key,
    value text
);

-- ---------------------------------------------------------------------------
-- Uprawnienia (RLS): wszystko widzi i zmienia tylko właściciel
-- ---------------------------------------------------------------------------
do $$
declare
    t text;
begin
    foreach t in array array['km_vehicles', 'km_routes', 'km_templates', 'km_trips', 'km_odometer',
                             'km_month_close', 'km_settings']
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists owner_all on public.%I', t);
        execute format('create policy owner_all on public.%I for all to authenticated
                        using (public.km_is_owner()) with check (public.km_is_owner())', t);
        execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end loop;
end;
$$;

alter table public.km_owner enable row level security;
drop policy if exists owner_self on public.km_owner;
create policy owner_self on public.km_owner for select to authenticated using (user_id = auth.uid());
