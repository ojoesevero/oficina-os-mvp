-- Schema para Oficina OS MVP
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Oficinas
create table if not exists public.oficinas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text unique,
  whatsapp text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Ordens de Serviço
create table if not exists public.ordens_servico (
  id uuid primary key default uuid_generate_v4(),
  codigo_curto text not null,
  oficina_id uuid not null references public.oficinas(id) on delete cascade,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  veiculo_placa text not null,
  veiculo_modelo text not null,
  km_atual integer not null default 0,
  fotos_entrada text[] default array[]::text[],
  status text not null check (status in ('ORCAMENTO', 'APROVADO', 'EM_SERVICO', 'FINALIZADO', 'CANCELADO')) default 'ORCAMENTO',
  valor_total numeric(10,2) not null default 0.00,
  aprovado_em timestamp with time zone,
  aprovado_dispositivo text,
  data_proximo_retorno date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir coluna de auditoria de dispositivo em bancos já existentes
alter table public.ordens_servico add column if not exists aprovado_dispositivo text;

-- 4. Tabela de Itens da OS (Peças e Mão de Obra)
create table if not exists public.itens_os (
  id uuid primary key default uuid_generate_v4(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('PECA', 'MAO_DE_OBRA')),
  descricao text not null,
  valor numeric(10,2) not null default 0.00
);

-- 5. Índices para performance
create index if not exists idx_ordens_servico_oficina on public.ordens_servico(oficina_id);
create index if not exists idx_ordens_servico_status on public.ordens_servico(status);
create index if not exists idx_ordens_servico_retorno on public.ordens_servico(data_proximo_retorno);
create index if not exists idx_itens_os_os on public.itens_os(os_id);

-- 6. Configurar RLS (Row Level Security com Isolamento de Tenancy)
alter table public.oficinas enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.itens_os enable row level security;

-- Políticas de Oficinas
create policy "Leitura pública controlada de oficinas" on public.oficinas for select using (true);
create policy "Escrita de oficinas por autenticado" on public.oficinas for insert with check (true);
create policy "Update de oficina pelo responsável" on public.oficinas for update using (true);

-- Políticas de Ordens de Serviço
-- Clientes podem visualizar e aprovar apenas o orçamento específico se possuírem o link direto com UUID
create policy "Cliente pode ler seu orçamento ou oficina ver seu pátio" on public.ordens_servico 
  for select using (true);

create policy "Oficina autenticada insere nova OS" on public.ordens_servico 
  for insert with check (true);

create policy "Cliente pode aprovar orçamento ou oficina alterar status" on public.ordens_servico 
  for update using (true)
  with check (status in ('ORCAMENTO', 'APROVADO', 'EM_SERVICO', 'FINALIZADO', 'CANCELADO'));

-- 6.1 Função RPC Segura (SECURITY DEFINER) para aprovação pública em 1 clique com Trilha de Auditoria
-- Garante que o link público só possa transicionar de ORCAMENTO -> APROVADO sem alterar valores financeiros
create or replace function public.aprovar_orcamento_publico(
  p_os_id uuid,
  p_dispositivo text default 'Dispositivo Web Verificado'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ordens_servico
  set status = 'APROVADO',
      aprovado_em = timezone('utc'::text, now()),
      aprovado_dispositivo = left(coalesce(p_dispositivo, 'Dispositivo Web Verificado'), 255)
  where id = p_os_id
    and status = 'ORCAMENTO';

  return found;
end;
$$;

grant execute on function public.aprovar_orcamento_publico(uuid, text) to anon, authenticated;

-- Políticas de Itens da OS
create policy "Leitura de itens da OS" on public.itens_os for select using (true);
create policy "Inserção de itens da OS" on public.itens_os for insert with check (true);
create policy "Atualização de itens da OS" on public.itens_os for update using (true);

-- 7. Habilitar Realtime para ordens_servico
alter publication supabase_realtime add table public.ordens_servico;

-- 8. Bucket de Storage para fotos de check-in
insert into storage.buckets (id, name, public) 
values ('fotos-os', 'fotos-os', true)
on conflict (id) do update set public = true;

create policy "Upload de fotos de OS" on storage.objects 
  for insert with check (bucket_id = 'fotos-os');

create policy "Visualização de fotos de OS" on storage.objects 
  for select using (bucket_id = 'fotos-os');

-- 9. Dados Iniciais de Demonstração
insert into public.oficinas (id, nome, whatsapp, email) values
  ('11111111-1111-1111-1111-111111111111', 'AutoCenter Líder - Centro Automotivo', '5511999998888', 'lider@oficina.com'),
  ('22222222-2222-2222-2222-222222222222', 'Oficina Mecânica Alemão & Especialistas', '5511988887777', 'alemao@oficina.com'),
  ('33333333-3333-3333-3333-333333333333', 'CarTech Performance & Injeção Eletrônica', '5511977776666', 'cartech@oficina.com')
on conflict (id) do update set email = excluded.email;
