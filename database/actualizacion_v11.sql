-- Actualización v11: resultados reales de partidos y clasificación automática
-- Ejecuta este archivo UNA VEZ en Supabase > SQL Editor > New query > Run.

alter table public.app_state
add column if not exists match_results jsonb not null default '{}'::jsonb;

update public.app_state
set match_results = '{}'::jsonb
where match_results is null;
