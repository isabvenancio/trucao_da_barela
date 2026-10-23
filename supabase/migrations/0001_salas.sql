-- Trucão da Barela — tabela das salas online (plano de arquitetura, seção 7).
-- Rode no SQL Editor do Supabase (ou com `supabase db push`).

create table if not exists public.salas (
  codigo        text primary key check (codigo ~ '^[A-Z0-9]{6}$'),
  versao        integer not null default 0,         -- controle otimista (RNF-001)
  dados         jsonb not null,                     -- documento completo da sala, só lido pelo servidor
  atualizada_em timestamptz not null default now(),
  expira_em     timestamptz not null                -- a linha pode ser apagada depois disto (RNF-007)
);

create index if not exists salas_expira_em_idx on public.salas (expira_em);

-- RNF-002: o navegador nunca lê a tabela. Com RLS ligado e nenhuma política,
-- a chave pública (anon) não acessa nada; só a chave de serviço, usada pelas funções da Vercel.
alter table public.salas enable row level security;

-- A chave secreta do servidor (papel service_role) ignora o RLS; o grant garante o acesso
-- mesmo em projetos que não expõem tabelas novas à API automaticamente.
grant select, insert, update, delete on table public.salas to service_role;
revoke all on table public.salas from anon, authenticated;

-- Limpeza diária opcional com pg_cron (Database → Extensions → pg_cron).
-- O servidor também apaga salas expiradas sempre que alguém cria uma sala.
-- select cron.schedule('limpar-salas', '0 7 * * *', $$ delete from public.salas where expira_em < now() $$);
