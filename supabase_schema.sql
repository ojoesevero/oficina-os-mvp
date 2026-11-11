-- =============================================================================
-- JS OrçaFácil (by Jonatan Severo Tech)
-- Script Oficial de Banco de Dados e Blindagem Multi-Tenant (Supabase RLS)
-- =============================================================================
-- Regra de Ouro Multi-Tenant:
-- Nenhum registro de uma oficina (tenant) pode ser lido, inserido, alterado ou
-- excluído por outra oficina. O acesso público do cliente final ocorre
-- EXCLUSIVAMENTE via RPCs SECURITY DEFINER restritas ao UUID v4 exato da OS.
-- =============================================================================

-- 1. Extensões necessárias
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 2. ESTRUTURA DE TABELAS MULTI-TENANT (TODAS VINCULADAS A oficina_id)
-- =============================================================================

-- 2.1 Tabela de Locatários / Oficinas (Tenants)
create table if not exists public.oficinas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references auth.users(id) on delete set null,
  nome text not null,
  email text unique,
  whatsapp text not null,
  cnpj_cpf text,
  endereco text,
  logo_url text,
  cor_primaria text default '#22c55e',
  plano text default 'PRO' check (plano in ('ESSENCIAL', 'PRO', 'MULTI')),
  ativo boolean default true not null,
  servicos_rapidos jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir colunas em bancos já existentes (Migração Idempotente)
alter table public.oficinas add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.oficinas add column if not exists logo_url text;
alter table public.oficinas add column if not exists cor_primaria text default '#22c55e';
alter table public.oficinas add column if not exists cnpj_cpf text;
alter table public.oficinas add column if not exists endereco text;
alter table public.oficinas add column if not exists plano text default 'PRO';
alter table public.oficinas add column if not exists ativo boolean default true;
alter table public.oficinas add column if not exists servicos_rapidos jsonb default '[]'::jsonb;

-- 2.2 Tabela de Clientes (Isolada por oficina_id)
create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  oficina_id uuid not null references public.oficinas(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  cpf_cnpj text,
  email text,
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.3 Tabela de Veículos (Isolada por oficina_id)
create table if not exists public.veiculos (
  id uuid primary key default uuid_generate_v4(),
  oficina_id uuid not null references public.oficinas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  placa text not null,
  modelo text not null,
  marca text,
  ano integer,
  cor text,
  km_atual integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.4 Tabela de Catálogo de Serviços Técnicos e Peças (Isolada por oficina_id)
create table if not exists public.catalogo_itens (
  id uuid primary key default uuid_generate_v4(),
  oficina_id uuid not null references public.oficinas(id) on delete cascade,
  tipo text not null check (tipo in ('PECA', 'MAO_DE_OBRA')),
  descricao text not null,
  valor numeric(10,2) not null default 0.00,
  ativo boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.5 Tabela de Ordens de Serviço / Orçamentos (Isolada por oficina_id)
create table if not exists public.ordens_servico (
  id uuid primary key default uuid_generate_v4(),
  codigo_curto text not null,
  oficina_id uuid not null references public.oficinas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  veiculo_id uuid references public.veiculos(id) on delete set null,
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

alter table public.ordens_servico add column if not exists aprovado_dispositivo text;
alter table public.ordens_servico add column if not exists cliente_id uuid references public.clientes(id) on delete set null;
alter table public.ordens_servico add column if not exists veiculo_id uuid references public.veiculos(id) on delete set null;

-- 2.6 Tabela de Itens da OS / Orçamento — Peças e Serviços Técnicos (Isolada por oficina_id e os_id)
create table if not exists public.itens_os (
  id uuid primary key default uuid_generate_v4(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  oficina_id uuid references public.oficinas(id) on delete cascade,
  tipo text not null check (tipo in ('PECA', 'MAO_DE_OBRA')),
  descricao text not null,
  valor numeric(10,2) not null default 0.00
);

alter table public.itens_os add column if not exists oficina_id uuid references public.oficinas(id) on delete cascade;

-- =============================================================================
-- 3. ÍNDICES DE PERFORMANCE E ISOLAMENTO MULTI-TENANT
-- =============================================================================
create index if not exists idx_oficinas_user_id on public.oficinas(user_id);
create index if not exists idx_clientes_oficina_id on public.clientes(oficina_id);
create index if not exists idx_veiculos_oficina_id on public.veiculos(oficina_id);
create index if not exists idx_veiculos_placa on public.veiculos(oficina_id, placa);
create index if not exists idx_catalogo_itens_oficina_id on public.catalogo_itens(oficina_id);
create index if not exists idx_ordens_servico_oficina on public.ordens_servico(oficina_id);
create index if not exists idx_ordens_servico_status on public.ordens_servico(oficina_id, status);
create index if not exists idx_ordens_servico_retorno on public.ordens_servico(oficina_id, data_proximo_retorno);
create index if not exists idx_itens_os_os on public.itens_os(os_id);
create index if not exists idx_itens_os_oficina on public.itens_os(oficina_id);

-- =============================================================================
-- 4. FUNÇÃO AUXILIAR DE RESOLUÇÃO DO TENANT ATIVO (SECURITY DEFINER)
-- =============================================================================
-- Retorna o UUID da oficina pertencente ao usuário autenticado no Supabase Auth
-- (via user_id = auth.uid() ou claim customizado no JWT 'oficina_id').
create or replace function public.current_oficina_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'oficina_id')::uuid,
    (select o.id from public.oficinas o where o.user_id = auth.uid() limit 1)
  );
$$;

-- Trigger para preencher automaticamente itens_os.oficina_id a partir da OS pai
create or replace function public.sync_item_os_oficina_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.oficina_id is null then
    select os.oficina_id into new.oficina_id
    from public.ordens_servico os
    where os.id = new.os_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_item_os_oficina_id on public.itens_os;
create trigger trg_sync_item_os_oficina_id
before insert or update on public.itens_os
for each row execute function public.sync_item_os_oficina_id();

-- =============================================================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- =============================================================================
alter table public.oficinas enable row level security;
alter table public.clientes enable row level security;
alter table public.veiculos enable row level security;
alter table public.catalogo_itens enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.itens_os enable row level security;

-- Limpar políticas legadas permissivas antes de aplicar as políticas estritas
drop policy if exists "Leitura pública controlada de oficinas" on public.oficinas;
drop policy if exists "Escrita de oficinas por autenticado" on public.oficinas;
drop policy if exists "Update de oficina pelo responsável" on public.oficinas;
drop policy if exists "Cliente pode ler seu orçamento ou oficina ver seu pátio" on public.ordens_servico;
drop policy if exists "Oficina autenticada insere nova OS" on public.ordens_servico;
drop policy if exists "Cliente pode aprovar orçamento ou oficina alterar status" on public.ordens_servico;
drop policy if exists "Leitura de itens da OS" on public.itens_os;
drop policy if exists "Inserção de itens da OS" on public.itens_os;
drop policy if exists "Atualização de itens da OS" on public.itens_os;
drop policy if exists "Exclusão de itens da OS" on public.itens_os;

-- =============================================================================
-- 5.1 POLÍTICAS RLS: TABELA `oficinas` (LOCATÁRIO / TENANT)
-- =============================================================================
drop policy if exists "oficinas_select_own" on public.oficinas;
create policy "oficinas_select_own" on public.oficinas
  for select to authenticated
  using (user_id = auth.uid() or id = public.current_oficina_id());

drop policy if exists "oficinas_insert_own" on public.oficinas;
create policy "oficinas_insert_own" on public.oficinas
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "oficinas_update_own" on public.oficinas;
create policy "oficinas_update_own" on public.oficinas
  for update to authenticated
  using (user_id = auth.uid() or id = public.current_oficina_id())
  with check (user_id = auth.uid() or id = public.current_oficina_id());

drop policy if exists "oficinas_delete_own" on public.oficinas;
create policy "oficinas_delete_own" on public.oficinas
  for delete to authenticated
  using (user_id = auth.uid() or id = public.current_oficina_id());

-- =============================================================================
-- 5.2 POLÍTICAS RLS: TABELA `clientes`
-- =============================================================================
drop policy if exists "clientes_select_tenant" on public.clientes;
create policy "clientes_select_tenant" on public.clientes
  for select to authenticated
  using (oficina_id = public.current_oficina_id());

drop policy if exists "clientes_insert_tenant" on public.clientes;
create policy "clientes_insert_tenant" on public.clientes
  for insert to authenticated
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "clientes_update_tenant" on public.clientes;
create policy "clientes_update_tenant" on public.clientes
  for update to authenticated
  using (oficina_id = public.current_oficina_id())
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "clientes_delete_tenant" on public.clientes;
create policy "clientes_delete_tenant" on public.clientes
  for delete to authenticated
  using (oficina_id = public.current_oficina_id());

-- =============================================================================
-- 5.3 POLÍTICAS RLS: TABELA `veiculos`
-- =============================================================================
drop policy if exists "veiculos_select_tenant" on public.veiculos;
create policy "veiculos_select_tenant" on public.veiculos
  for select to authenticated
  using (oficina_id = public.current_oficina_id());

drop policy if exists "veiculos_insert_tenant" on public.veiculos;
create policy "veiculos_insert_tenant" on public.veiculos
  for insert to authenticated
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "veiculos_update_tenant" on public.veiculos;
create policy "veiculos_update_tenant" on public.veiculos
  for update to authenticated
  using (oficina_id = public.current_oficina_id())
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "veiculos_delete_tenant" on public.veiculos;
create policy "veiculos_delete_tenant" on public.veiculos
  for delete to authenticated
  using (oficina_id = public.current_oficina_id());

-- =============================================================================
-- 5.4 POLÍTICAS RLS: TABELA `catalogo_itens` (SERVIÇOS E PEÇAS CADASTRADOS)
-- =============================================================================
drop policy if exists "catalogo_select_tenant" on public.catalogo_itens;
create policy "catalogo_select_tenant" on public.catalogo_itens
  for select to authenticated
  using (oficina_id = public.current_oficina_id());

drop policy if exists "catalogo_insert_tenant" on public.catalogo_itens;
create policy "catalogo_insert_tenant" on public.catalogo_itens
  for insert to authenticated
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "catalogo_update_tenant" on public.catalogo_itens;
create policy "catalogo_update_tenant" on public.catalogo_itens
  for update to authenticated
  using (oficina_id = public.current_oficina_id())
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "catalogo_delete_tenant" on public.catalogo_itens;
create policy "catalogo_delete_tenant" on public.catalogo_itens
  for delete to authenticated
  using (oficina_id = public.current_oficina_id());

-- =============================================================================
-- 5.5 POLÍTICAS RLS: TABELA `ordens_servico` (OS & ORÇAMENTOS)
-- =============================================================================
drop policy if exists "os_select_tenant" on public.ordens_servico;
create policy "os_select_tenant" on public.ordens_servico
  for select to authenticated
  using (oficina_id = public.current_oficina_id());

drop policy if exists "os_insert_tenant" on public.ordens_servico;
create policy "os_insert_tenant" on public.ordens_servico
  for insert to authenticated
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "os_update_tenant" on public.ordens_servico;
create policy "os_update_tenant" on public.ordens_servico
  for update to authenticated
  using (oficina_id = public.current_oficina_id())
  with check (oficina_id = public.current_oficina_id());

drop policy if exists "os_delete_tenant" on public.ordens_servico;
create policy "os_delete_tenant" on public.ordens_servico
  for delete to authenticated
  using (oficina_id = public.current_oficina_id());

-- =============================================================================
-- 5.6 POLÍTICAS RLS: TABELA `itens_os` (PEÇAS E SERVIÇOS TÉCNICOS DA OS)
-- =============================================================================
drop policy if exists "itens_os_select_tenant" on public.itens_os;
create policy "itens_os_select_tenant" on public.itens_os
  for select to authenticated
  using (
    oficina_id = public.current_oficina_id()
    or exists (
      select 1 from public.ordens_servico os
      where os.id = itens_os.os_id
        and os.oficina_id = public.current_oficina_id()
    )
  );

drop policy if exists "itens_os_insert_tenant" on public.itens_os;
create policy "itens_os_insert_tenant" on public.itens_os
  for insert to authenticated
  with check (
    exists (
      select 1 from public.ordens_servico os
      where os.id = itens_os.os_id
        and os.oficina_id = public.current_oficina_id()
    )
  );

drop policy if exists "itens_os_update_tenant" on public.itens_os;
create policy "itens_os_update_tenant" on public.itens_os
  for update to authenticated
  using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = itens_os.os_id
        and os.oficina_id = public.current_oficina_id()
    )
  )
  with check (
    exists (
      select 1 from public.ordens_servico os
      where os.id = itens_os.os_id
        and os.oficina_id = public.current_oficina_id()
    )
  );

drop policy if exists "itens_os_delete_tenant" on public.itens_os;
create policy "itens_os_delete_tenant" on public.itens_os
  for delete to authenticated
  using (
    exists (
      select 1 from public.ordens_servico os
      where os.id = itens_os.os_id
        and os.oficina_id = public.current_oficina_id()
    )
  );

-- =============================================================================
-- 6. RPCs BLINDADAS PARA O PORTAL DO CLIENTE FINAL (/os/[id])
-- =============================================================================
-- Como as tabelas possuem RLS estrito para 'authenticated', o cliente final
-- (que não possui login e recebe apenas o link no WhatsApp) consulta e aprova
-- sua OS exclusivamente por estas 2 funções SECURITY DEFINER via UUID v4 exato.
-- Isso impede 100% qualquer varredura/listagem de ordens ou oficinas por anônimos.

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

-- =============================================================================
-- 7. STORAGE BUCKET & REALTIME
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('fotos-os', 'fotos-os', true)
on conflict (id) do update set public = true;

drop policy if exists "Upload de fotos de OS" on storage.objects;
create policy "Upload de fotos de OS" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-os');

drop policy if exists "Visualização de fotos de OS" on storage.objects;
create policy "Visualização de fotos de OS" on storage.objects
  for select
  using (bucket_id = 'fotos-os');
