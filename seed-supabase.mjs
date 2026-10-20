import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wypabdhhzgkfrfbnslat.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedData() {
  console.log('--- Verificando e populando ordens de serviço realistas no Supabase ---');
  
  const { data: oficinas } = await admin.from('oficinas').select('*');
  if (!oficinas || oficinas.length === 0) return;

  const of1 = oficinas[0].id;
  const of2 = oficinas[1]?.id || of1;

  const hoje = new Date();
  
  // Datas para testes
  const vencida1 = new Date(hoje);
  vencida1.setDate(hoje.getDate() - 12); // Venceu há 12 dias

  const venceEmBreve = new Date(hoje);
  venceEmBreve.setDate(hoje.getDate() + 5); // Vence em 5 dias

  const futura = new Date(hoje);
  futura.setDate(hoje.getDate() + 170); // Daqui a 6 meses

  const ordens = [
    {
      codigo_curto: 'OS-8491',
      oficina_id: of1,
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
      data_proximo_retorno: futura.toISOString().split('T')[0],
      itens: [
        { tipo: 'PECA', descricao: 'Jogo de Pastilhas de Freio Cerâmica Bosch', valor: 420.00 },
        { tipo: 'PECA', descricao: 'Disco de Freio Ventilado Fremax (Par)', valor: 580.00 },
        { tipo: 'PECA', descricao: 'Fluido de Freio DOT 4 LV Motul', valor: 130.00 },
        { tipo: 'MAO_DE_OBRA', descricao: 'Mão de Obra: Troca de Freios e Sangria Completa', valor: 350.00 },
      ]
    },
    {
      codigo_curto: 'OS-8492',
      oficina_id: of1,
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
      aprovado_em: new Date(Date.now() - 3600000).toISOString(),
      data_proximo_retorno: futura.toISOString().split('T')[0],
      itens: [
        { tipo: 'PECA', descricao: 'Amortecedores Dianteiros Cofap Turbogás', valor: 1100.00 },
        { tipo: 'PECA', descricao: 'Kit Batentes Monroe Axios', valor: 240.00 },
        { tipo: 'MAO_DE_OBRA', descricao: 'Mão de Obra Suspensão + Alinhamento 3D', valor: 850.00 },
      ]
    },
    {
      codigo_curto: 'OS-7910',
      oficina_id: of1,
      cliente_nome: 'Juliana Mendes Santos',
      cliente_whatsapp: '5511985554321',
      veiculo_placa: 'ABC1D23',
      veiculo_modelo: 'Chevrolet Onix Plus 1.0 Turbo',
      km_atual: 42000,
      fotos_entrada: [],
      status: 'FINALIZADO',
      valor_total: 620.00,
      aprovado_em: new Date(Date.now() - 180 * 86400000).toISOString(),
      data_proximo_retorno: vencida1.toISOString().split('T')[0], // Já venceu!
      itens: [
        { tipo: 'PECA', descricao: 'Óleo Motor Sintético 5W30 Dexos (4L)', valor: 260.00 },
        { tipo: 'PECA', descricao: 'Filtros de Óleo, Ar e Cabine', valor: 180.00 },
        { tipo: 'MAO_DE_OBRA', descricao: 'Revisão Preventiva', valor: 180.00 },
      ]
    },
    {
      codigo_curto: 'OS-7935',
      oficina_id: of1,
      cliente_nome: 'Fábio Camargo Lima',
      cliente_whatsapp: '5511996667788',
      veiculo_placa: 'KLP9E88',
      veiculo_modelo: 'Jeep Compass Longitude 2.0 Flex',
      km_atual: 75400,
      fotos_entrada: [],
      status: 'FINALIZADO',
      valor_total: 1350.00,
      aprovado_em: new Date(Date.now() - 170 * 86400000).toISOString(),
      data_proximo_retorno: venceEmBreve.toISOString().split('T')[0], // Vence em 5 dias!
      itens: [
        { tipo: 'PECA', descricao: 'Velas de Ignição Iridium', valor: 420.00 },
        { tipo: 'PECA', descricao: 'Correia de Acessórios', valor: 230.00 },
        { tipo: 'MAO_DE_OBRA', descricao: 'Mão de Obra e Descarbonização', valor: 700.00 },
      ]
    }
  ];

  for (const os of ordens) {
    const { itens, ...osData } = os;
    const { data: created, error } = await admin
      .from('ordens_servico')
      .insert(osData)
      .select()
      .single();

    if (!error && created) {
      console.log(`✅ OS ${created.codigo_curto} inserida no Supabase`);
      const itensWithOS = itens.map((it) => ({ ...it, os_id: created.id }));
      await admin.from('itens_os').insert(itensWithOS);
    } else {
      console.log(`Info OS:`, error?.message);
    }
  }

  console.log('✅ Banco populado com sucesso para a demonstração!');
}

seedData();
