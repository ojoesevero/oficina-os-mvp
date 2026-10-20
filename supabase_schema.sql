-- Schema para Oficina OS MVP
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Oficinas
create table if not exists public.oficinas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
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
  data_proximo_retorno date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 6. Configurar RLS (Permissões abertas para o MVP Demo)
alter table public.oficinas enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.itens_os enable row level security;

create policy "Permitir leitura pública em oficinas" on public.oficinas for select using (true);
create policy "Permitir escrita em oficinas" on public.oficinas for insert with check (true);
create policy "Permitir update em oficinas" on public.oficinas for update using (true);

create policy "Permitir leitura pública em ordens_servico" on public.ordens_servico for select using (true);
create policy "Permitir inserção em ordens_servico" on public.ordens_servico for insert with check (true);
create policy "Permitir atualização em ordens_servico" on public.ordens_servico for update using (true);

create policy "Permitir leitura pública em itens_os" on public.itens_os for select using (true);
create policy "Permitir inserção em itens_os" on public.itens_os for insert with check (true);
create policy "Permitir atualização em itens_os" on public.itens_os for update using (true);

-- 7. Habilitar Realtime para ordens_servico
alter publication supabase_realtime add table public.ordens_servico;

-- 8. Bucket de Storage para fotos
insert into storage.buckets (id, name, public) 
values ('fotos-os', 'fotos-os', true)
on conflict (id) do update set public = true;

create policy "Upload público de fotos" on storage.objects 
  for insert with check (bucket_id = 'fotos-os');

create policy "Visualização pública de fotos" on storage.objects 
  for select using (bucket_id = 'fotos-os');

-- 9. Dados Iniciais de Demonstração
insert into public.oficinas (id, nome, whatsapp) values
  ('11111111-1111-1111-1111-111111111111', 'AutoCenter Líder - Centro Automotivo', '5511999998888'),
  ('22222222-2222-2222-2222-222222222222', 'Oficina Mecânica Alemão & Filhos', '5511988887777')
on conflict (id) do nothing;
