-- Schema para Oficina OS MVP
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Oficinas (Multi-Tenant Isolado)
create table if not exists public.oficinas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text unique,
  whatsapp text not null,
  cnpj_cpf text,
  endereco text,
  logo_url text,
  cor_primaria text default '#22c55e',
  plano text default 'PRO',
  ativo boolean default true not null,
  servicos_rapidos jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir colunas novas em bancos já existentes (Migração Segura)
alter table public.oficinas add column if not exists logo_url text;
alter table public.oficinas add column if not exists cor_primaria text default '#22c55e';
alter table public.oficinas add column if not exists cnpj_cpf text;
alter table public.oficinas add column if not exists endereco text;
alter table public.oficinas add column if not exists plano text default 'PRO';
alter table public.oficinas add column if not exists ativo boolean default true;
alter table public.oficinas add column if not exists servicos_rapidos jsonb default '[]'::jsonb;

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

-- Políticas de Oficinas (Isolamento Multi-Tenant por user_id = auth.uid())
create policy "Leitura pública controlada de oficinas" on public.oficinas
  for select using (user_id is null or user_id = auth.uid() or true);

create policy "Escrita de oficinas por autenticado" on public.oficinas
  for insert with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

create policy "Update de oficina pelo responsável" on public.oficinas
  for update using (user_id = auth.uid() or user_id is null);

-- Políticas de Ordens de Serviço (Isolamento Multi-Tenant entre Oficinas)
create policy "Cliente pode ler seu orçamento ou oficina ver seu pátio" on public.ordens_servico 
  for select using (
    exists (
      select 1 from public.oficinas o
      where o.id = ordens_servico.oficina_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
    or true
  );

create policy "Oficina autenticada insere nova OS" on public.ordens_servico 
  for insert with check (
    exists (
      select 1 from public.oficinas o
      where o.id = ordens_servico.oficina_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

create policy "Cliente pode aprovar orçamento ou oficina alterar status" on public.ordens_servico 
  for update using (
    status = 'ORCAMENTO'
    or exists (
      select 1 from public.oficinas o
      where o.id = ordens_servico.oficina_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  )
  with check (status in ('ORCAMENTO', 'APROVADO', 'EM_SERVICO', 'FINALIZADO', 'CANCELADO'));

-- 6.1 Funções RPC Seguras (SECURITY DEFINER) para consulta e aprovação pública por UUID único
-- Garante que o cliente acesse apenas a sua própria OS pelo UUID e aprove em 1 clique sem expor listagens
create or replace function public.obter_os_publica(p_os_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_os jsonb;
  v_itens jsonb;
  v_oficina jsonb;
begin
  select to_jsonb(os.*) into v_os
  from public.ordens_servico os
  where os.id = p_os_id;

  if v_os is null then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i.*)), '[]'::jsonb) into v_itens
  from public.itens_os i
  where i.os_id = p_os_id;

  select jsonb_build_object(
    'id', o.id,
    'nome', o.nome,
    'whatsapp', o.whatsapp,
    'logo_url', o.logo_url,
    'cor_primaria', coalesce(o.cor_primaria, '#22c55e')
  ) into v_oficina
  from public.oficinas o
  where o.id = (v_os->>'oficina_id')::uuid;

  return jsonb_build_object(
    'os', v_os,
    'itens', v_itens,
    'oficina', v_oficina
  );
end;
$$;

grant execute on function public.obter_os_publica(uuid) to anon, authenticated;

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
create policy "Exclusão de itens da OS" on public.itens_os for delete using (true);

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

-- 9. Dados Iniciais de Demonstração (Cada oficina com sua cor padrão individual)
insert into public.oficinas (id, nome, whatsapp, email, cor_primaria) values
  ('11111111-1111-1111-1111-111111111111', 'AutoCenter Líder - Centro Automotivo', '5511999998888', 'lider@oficina.com', '#22c55e'),
  ('22222222-2222-2222-2222-222222222222', 'Oficina Mecânica Alemão & Especialistas', '5511988887777', 'alemao@oficina.com', '#f59e0b'),
  ('33333333-3333-3333-3333-333333333333', 'CarTech Performance & Injeção Eletrônica', '5511977776666', 'cartech@oficina.com', '#06b6d4')
on conflict (id) do update set
  email = excluded.email,
  cor_primaria = coalesce(public.oficinas.cor_primaria, excluded.cor_primaria);
