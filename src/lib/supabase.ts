import { createClient } from '@supabase/supabase-js';
import { Oficina, OrdemServico, ItemOS } from '@/types/database';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-oficina-os.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_demo';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('seu-projeto') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-oficina-os')
);

// Cliente oficial Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Dados mockados iniciais realistas para o Modo Demo (armazenados também em localStorage quando offline/demo)
export const DEMO_OFICINAS: Oficina[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nome: 'AutoCenter Líder - Centro Automotivo',
    whatsapp: '5511999998888',
    email: 'lider@oficina.com',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nome: 'Oficina Mecânica Alemão & Especialistas',
    whatsapp: '5511988887777',
    email: 'alemao@oficina.com',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nome: 'CarTech Performance & Injeção Eletrônica',
    whatsapp: '5511977776666',
    email: 'cartech@oficina.com',
  },
];

// Datas estáticas de demonstração para evitar instabilidade no prerender do Next.js 16
export const DEMO_ORDENS_SERVICO: OrdemServico[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    codigo_curto: 'OS-8491',
    oficina_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Carlos Eduardo Ferreira',
    cliente_whatsapp: '5511991234567',
    veiculo_placa: 'BRA2E19',
    veiculo_modelo: 'Honda Civic EXL 2.0 2021',
    km_atual: 48500,
    fotos_entrada: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'ORCAMENTO',
    valor_total: 1480.00,
    aprovado_em: null,
    data_proximo_retorno: '2027-04-20',
    created_at: '2026-10-20T09:30:00.000Z',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    codigo_curto: 'OS-8492',
    oficina_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Mariana Silveira Ramos',
    cliente_whatsapp: '5511982345678',
    veiculo_placa: 'RJK4H88',
    veiculo_modelo: 'Toyota Corolla Altis 2.0',
    km_atual: 62300,
    fotos_entrada: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'APROVADO',
    valor_total: 2190.00,
    aprovado_em: '2026-10-20T11:45:00.000Z',
    data_proximo_retorno: '2027-04-20',
    created_at: '2026-10-20T10:15:00.000Z',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    codigo_curto: 'OS-8493',
    oficina_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Roberto Antunes Albuquerque',
    cliente_whatsapp: '5511973456789',
    veiculo_placa: 'FXT9A32',
    veiculo_modelo: 'VW Nivus Highline 1.0 TSI',
    km_atual: 31200,
    fotos_entrada: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'EM_SERVICO',
    valor_total: 890.00,
    aprovado_em: '2026-10-19T14:20:00.000Z',
    data_proximo_retorno: '2027-04-20',
    created_at: '2026-10-19T11:00:00.000Z',
  },
  // Alertas de Retorno (6 meses / vencidos / próximos de vencer em 15 dias)
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    codigo_curto: 'OS-7910',
    oficina_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Juliana Mendes Santos',
    cliente_whatsapp: '5511985554321',
    veiculo_placa: 'ABC1D23',
    veiculo_modelo: 'Chevrolet Onix Plus 1.0 Turbo',
    km_atual: 42000,
    fotos_entrada: [],
    status: 'FINALIZADO',
    valor_total: 620.00,
    aprovado_em: '2026-04-10T16:00:00.000Z',
    data_proximo_retorno: '2026-10-10', // Venceu há 10 dias!
    created_at: '2026-04-10T15:00:00.000Z',
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    codigo_curto: 'OS-7935',
    oficina_id: '11111111-1111-1111-1111-111111111111',
    cliente_nome: 'Fábio Camargo Lima',
    cliente_whatsapp: '5511996667788',
    veiculo_placa: 'KLP9E88',
    veiculo_modelo: 'Jeep Compass Longitude 2.0 Flex',
    km_atual: 75400,
    fotos_entrada: [],
    status: 'FINALIZADO',
    valor_total: 1350.00,
    aprovado_em: '2026-04-27T10:00:00.000Z',
    data_proximo_retorno: '2026-10-27', // Vence em 7 dias!
    created_at: '2026-04-27T09:00:00.000Z',
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    codigo_curto: 'OS-8102',
    oficina_id: '22222222-2222-2222-2222-222222222222',
    cliente_nome: 'Henrique Becker',
    cliente_whatsapp: '5511981112233',
    veiculo_placa: 'ALM8B77',
    veiculo_modelo: 'Volkswagen Gol 1.6 MSI',
    km_atual: 89000,
    fotos_entrada: [],
    status: 'ORCAMENTO',
    valor_total: 940.00,
    aprovado_em: null,
    data_proximo_retorno: '2026-10-27',
    created_at: '2026-10-20T08:00:00.000Z',
  }
];

export const DEMO_ITENS_OS: ItemOS[] = [
  // Para OS-8491 (Honda Civic)
  {
    id: 'item-101',
    os_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    tipo: 'PECA',
    descricao: 'Jogo de Pastilhas de Freio Dianteiras Cerâmica Bosch',
    valor: 420.00,
  },
  {
    id: 'item-102',
    os_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    tipo: 'PECA',
    descricao: 'Disco de Freio Dianteiro Ventilado Fremax (Par)',
    valor: 580.00,
  },
  {
    id: 'item-103',
    os_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    tipo: 'PECA',
    descricao: 'Fluido de Freio DOT 4 LV Motul 500ml',
    valor: 130.00,
  },
  {
    id: 'item-104',
    os_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    tipo: 'MAO_DE_OBRA',
    descricao: 'Mão de Obra: Substituição Discos, Pastilhas e Sangria Completa',
    valor: 350.00,
  },
  // Para OS-8492 (Corolla)
  {
    id: 'item-201',
    os_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    tipo: 'PECA',
    descricao: 'Amortecedor Dianteiro Cofap Turbogás (Par)',
    valor: 1100.00,
  },
  {
    id: 'item-202',
    os_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    tipo: 'PECA',
    descricao: 'Kit Batente e Coifa Dianteiro Monroe Axios',
    valor: 240.00,
  },
  {
    id: 'item-203',
    os_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    tipo: 'MAO_DE_OBRA',
    descricao: 'Mão de Obra: Troca de Amortecedores + Alinhamento Computadorizado 3D',
    valor: 850.00,
  },
  // Para OS-7910 (Retorno)
  {
    id: 'item-401',
    os_id: 'a1b2c3d4-0004-4000-8000-000000000004',
    tipo: 'PECA',
    descricao: 'Óleo Motor Sintético 5W30 Dexos 1 (4 Litros)',
    valor: 260.00,
  },
  {
    id: 'item-402',
    os_id: 'a1b2c3d4-0004-4000-8000-000000000004',
    tipo: 'PECA',
    descricao: 'Filtro de Óleo, Filtro de Ar e Filtro de Cabine',
    valor: 180.00,
  },
  {
    id: 'item-403',
    os_id: 'a1b2c3d4-0004-4000-8000-000000000004',
    tipo: 'MAO_DE_OBRA',
    descricao: 'Revisão Preventiva e Troca de Filtros e Lubrificantes',
    valor: 180.00,
  },
];
