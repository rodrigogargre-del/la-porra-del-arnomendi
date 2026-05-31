-- La Porra del Arnomendi - Base de datos Supabase
-- Ejecuta este archivo en Supabase > SQL Editor > New query > Run.

create table if not exists public.app_state (
  id text primary key,
  users jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  bets jsonb not null default '[]'::jsonb,
  match_results jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select" on public.app_state;
drop policy if exists "app_state_insert" on public.app_state;
drop policy if exists "app_state_update" on public.app_state;
drop policy if exists "app_state_delete" on public.app_state;

-- IMPORTANTE:
-- Estas políticas permiten a la web leer y guardar el estado común de la porra con la clave pública.
-- Es suficiente para una porra privada sencilla protegida por contraseña general, pero no equivale a seguridad bancaria.
create policy "app_state_select" on public.app_state for select to anon, authenticated using (true);
create policy "app_state_insert" on public.app_state for insert to anon, authenticated with check (true);
create policy "app_state_update" on public.app_state for update to anon, authenticated using (true) with check (true);
create policy "app_state_delete" on public.app_state for delete to anon, authenticated using (true);

insert into public.app_state (id, users, events, bets, match_results)
values ('main', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;
