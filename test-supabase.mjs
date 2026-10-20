import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wypabdhhzgkfrfbnslat.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HSb9amNPF0g_jDw_2Xg22g_fh6udCv1';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSupabase() {
  console.log('--- TESTANDO CONEXÃO COM O SUPABASE ---');
  console.log('URL:', SUPABASE_URL);

  // 1. Testar Leitura na tabela 'oficinas'
  console.log('\n1. Testando leitura na tabela oficinas...');
  const { data: oficinas, error: ofError } = await supabase.from('oficinas').select('*');
  if (ofError) {
    console.error('❌ Erro ao ler oficinas:', ofError.message);
  } else {
    console.log(`✅ Sucesso! Oficinas encontradas: ${oficinas.length}`);
    console.log(oficinas);
  }

  // 2. Se não houver oficinas, insere uma para teste
  let oficinaId = oficinas && oficinas.length > 0 ? oficinas[0].id : null;
  if (!oficinaId) {
    console.log('\n2. Inserindo oficina de teste...');
    const { data: newOf, error: insError } = await supabase.from('oficinas').insert({
      nome: 'Oficina Central de Teste',
      whatsapp: '5511999998888',
    }).select().single();

    if (insError) {
      console.error('❌ Erro ao inserir oficina:', insError.message);
    } else {
      console.log('✅ Oficina criada:', newOf);
      oficinaId = newOf.id;
    }
  }

  // 3. Testar Inserção de uma Ordem de Serviço de Teste
  console.log('\n3. Testando criação de Ordem de Serviço...');
  const testCodigo = `OS-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data: novaOS, error: osError } = await supabase.from('ordens_servico').insert({
    codigo_curto: testCodigo,
    oficina_id: oficinaId,
    cliente_nome: 'Marcos Vinícius (Teste)',
    cliente_whatsapp: '5511988887777',
    veiculo_placa: 'BRA2E19',
    veiculo_modelo: 'Toyota Corolla Cross XRE 2.0',
    km_atual: 32000,
    fotos_entrada: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80'],
    status: 'ORCAMENTO',
    valor_total: 1250.00,
    data_proximo_retorno: '2027-04-20',
  }).select().single();

  if (osError) {
    console.error('❌ Erro ao inserir OS:', osError.message);
  } else {
    console.log(`✅ Sucesso! OS criada com ID: ${novaOS.id} e código: ${novaOS.codigo_curto}`);

    // 4. Testar Inserção de Itens da OS
    console.log('\n4. Testando inserção de Itens da OS...');
    const { data: itens, error: itensError } = await supabase.from('itens_os').insert([
      { os_id: novaOS.id, tipo: 'PECA', descricao: 'Pastilhas Dianteiras Cerâmica', valor: 450.00 },
      { os_id: novaOS.id, tipo: 'MAO_DE_OBRA', descricao: 'Substituição e Sangria de Freios', valor: 250.00 },
      { os_id: novaOS.id, tipo: 'PECA', descricao: 'Óleo Sintético 0W20 (4L)', valor: 350.00 },
      { os_id: novaOS.id, tipo: 'MAO_DE_OBRA', descricao: 'Revisão Preventiva', valor: 200.00 },
    ]).select();

    if (itensError) {
      console.error('❌ Erro ao inserir itens:', itensError.message);
    } else {
      console.log(`✅ Sucesso! ${itens.length} itens inseridos.`);
    }

    // 5. Testar Aprovação da OS (Ação do Cliente)
    console.log('\n5. Testando atualização do status para APROVADO...');
    const agora = new Date().toISOString();
    const { error: updateError } = await supabase.from('ordens_servico').update({
      status: 'APROVADO',
      aprovado_em: agora,
    }).eq('id', novaOS.id);

    if (updateError) {
      console.error('❌ Erro ao aprovar OS:', updateError.message);
    } else {
      console.log(`✅ Sucesso! OS ${novaOS.codigo_curto} atualizada para status APROVADO em ${agora}`);
    }
  }

  // 6. Testar Bucket de Storage 'fotos-os'
  console.log('\n6. Testando acesso ao bucket de Storage fotos-os...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('❌ Erro ao listar buckets:', bucketError.message);
  } else {
    const bucketFotos = buckets.find((b) => b.name === 'fotos-os' || b.id === 'fotos-os');
    if (bucketFotos) {
      console.log('✅ Bucket "fotos-os" encontrado no Storage:', bucketFotos);
    } else {
      console.log('ℹ️ Buckets existentes:', buckets.map((b) => b.name));
    }
  }

  console.log('\n--- FIM DOS TESTES ---');
}

testSupabase();
