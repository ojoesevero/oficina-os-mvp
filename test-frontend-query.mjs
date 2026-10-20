import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wypabdhhzgkfrfbnslat.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HSb9amNPF0g_jDw_2Xg22g_fh6udCv1';

const client = createClient(SUPABASE_URL, ANON_KEY);

async function verifyFrontendClient() {
  console.log('--- TESTANDO ACESSO DO FRONTEND (ANON KEY) ---');
  
  // 1. Oficinas
  const { data: oficinas, error: ofError } = await client.from('oficinas').select('*');
  console.log('1. Oficinas (Anon):', ofError ? ofError.message : `✅ ${oficinas.length} encontradas`);

  // 2. Ordens de Serviço
  const { data: ordens, error: osError } = await client.from('ordens_servico').select('*, oficinas(*), itens_os(*)');
  console.log('2. Ordens de Serviço com Joins (Anon):', osError ? osError.message : `✅ ${ordens.length} ordens com itens e oficinas`);

  // 3. Exemplo de OS para página pública do cliente
  if (ordens && ordens.length > 0) {
    const first = ordens[0];
    console.log(`\n📋 Exemplo de OS para o link do cliente: /os/${first.id}`);
    console.log(`- Código: ${first.codigo_curto}`);
    console.log(`- Veículo: ${first.veiculo_modelo} (${first.veiculo_placa})`);
    console.log(`- Status: ${first.status}`);
    console.log(`- Valor: R$ ${first.valor_total}`);
    console.log(`- Itens: ${first.itens_os?.length || 0}`);
  }
}

verifyFrontendClient();
