-- Tabela de patrocinadores do Bingo Digital
-- Execute este script no SQL Editor do seu projeto Supabase

create table if not exists public.sponsors (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  logo_url           text        not null default '',
  contact_name       text        default '',
  site_url           text        default '',
  instagram_url      text        default '',
  whatsapp_number    text        default '',
  qr_type            text        not null default 'site',   -- 'site' | 'instagram' | 'whatsapp'
  tier               text        not null default 'simples', -- 'simples' | 'destaque' | 'personalizado'
  sponsorship_amount text        default '',
  appearances        integer     not null default 3,
  duration_seconds   integer     not null default 10,
  active             boolean     not null default true,
  created_at         timestamptz not null default now()
);

alter table public.sponsors enable row level security;

-- Telão (público) pode ler patrocinadores
create policy "sponsors_public_read" on public.sponsors
  for select using (true);

-- Somente autenticados (admin) podem criar/editar/deletar
create policy "sponsors_auth_write" on public.sponsors
  for all using (auth.role() = 'authenticated');
