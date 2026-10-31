-- Kilometrówka 1.1.0 – każde konto ma własne dane (np. osobne konto dla żony z jej autem).
-- Uruchom raz w Supabase: SQL Editor → New query → wklej całość → Run
-- (po pliku 20261031000000_init.sql).
--
-- Dotychczasowe dane zostają przypisane do konta, które było właścicielem (km_owner).
-- Nowe konta zakłada się w Supabase: Authentication → Users → Add user. Każde zalogowane
-- konto widzi i zmienia wyłącznie swoje wiersze. Dane FV Meter (tabele bez przedrostka km_)
-- dalej widzi tylko właściciel FV Meter.

do $$
declare
    t text;
    owner uuid;
begin
    select user_id into owner from public.km_owner order by created_at limit 1;
    foreach t in array array['km_vehicles', 'km_routes', 'km_templates', 'km_trips', 'km_odometer',
                             'km_month_close', 'km_settings']
    loop
        execute format('alter table public.%I add column if not exists user_id uuid references auth.users (id) on delete cascade', t);
        if owner is not null then
            execute format('update public.%I set user_id = %L where user_id is null', t, owner);
        end if;
        execute format('alter table public.%I alter column user_id set default auth.uid()', t);
        execute format('alter table public.%I alter column user_id set not null', t);
        execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id', t);
        execute format('drop policy if exists owner_all on public.%I', t);
        execute format('drop policy if exists user_own on public.%I', t);
        execute format('create policy user_own on public.%I for all to authenticated
                        using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    end loop;
end;
$$;

-- ustawienia (dane firmy, nazwy miejsc…) osobno dla każdego konta
alter table public.km_settings drop constraint if exists km_settings_pkey;
alter table public.km_settings add primary key (user_id, key);

-- dostęp ma każde zalogowane konto (zakładanie kont jest wyłączone – konta tworzy się w panelu Supabase)
create or replace function public.km_claim_ownership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select auth.uid() is not null;
$$;
