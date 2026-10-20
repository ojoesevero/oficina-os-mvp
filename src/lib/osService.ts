import { supabase, isSupabaseConfigured, DEMO_OFICINAS, DEMO_ORDENS_SERVICO, DEMO_ITENS_OS } from './supabase';
import { Oficina, OrdemServico, ItemOS } from '@/types/database';

const STORAGE_KEY_OS = 'oficina_os_items_data_v1';
const STORAGE_KEY_ITEMS = 'oficina_os_itens_list_v1';
const STORAGE_KEY_OFICINAS = 'oficina_os_oficinas_v1';

// Helpers para sincronizar LocalStorage em modo demo
function getLocalOficinas(): Oficina[] {
  if (typeof window === 'undefined') return DEMO_OFICINAS;
  const saved = localStorage.getItem(STORAGE_KEY_OFICINAS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(DEMO_OFICINAS));
    return DEMO_OFICINAS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return DEMO_OFICINAS;
  }
}

function getLocalOrdens(): OrdemServico[] {
  if (typeof window === 'undefined') return DEMO_ORDENS_SERVICO;
  const saved = localStorage.getItem(STORAGE_KEY_OS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY_OS, JSON.stringify(DEMO_ORDENS_SERVICO));
    return DEMO_ORDENS_SERVICO;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return DEMO_ORDENS_SERVICO;
  }
}

function getLocalItens(): ItemOS[] {
  if (typeof window === 'undefined') return DEMO_ITENS_OS;
  const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(DEMO_ITENS_OS));
    return DEMO_ITENS_OS;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return DEMO_ITENS_OS;
  }
}

function saveLocalOrdens(ordens: OrdemServico[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_OS, JSON.stringify(ordens));
    window.dispatchEvent(new CustomEvent('os_status_changed', { detail: ordens }));
  }
}

function saveLocalItens(itens: ItemOS[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(itens));
  }
}

// 1. Obter todas as oficinas cadastradas
export async function fetchOficinas(): Promise<Oficina[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('oficinas').select('*').order('nome');
      if (!error && data && data.length > 0) {
        return data as Oficina[];
      }
    } catch (e) {
      console.warn('Erro ao buscar oficinas no Supabase, usando dados locais:', e);
    }
  }
  return getLocalOficinas();
}

// 2. Obter ordens de serviço por oficina
export async function fetchOrdensServico(oficinaId?: string): Promise<OrdemServico[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('ordens_servico').select('*, oficinas(*)').order('created_at', { ascending: false });
      if (oficinaId) {
        query = query.eq('oficina_id', oficinaId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data as OrdemServico[];
      }
    } catch (e) {
      console.warn('Erro ao buscar ordens no Supabase, usando dados locais:', e);
    }
  }

  const locais = getLocalOrdens();
  if (oficinaId) {
    return locais.filter((os) => os.oficina_id === oficinaId);
  }
  return locais;
}

// 3. Obter uma OS completa por ID
export async function fetchOrdemServicoById(id: string): Promise<{ os: OrdemServico; itens: ItemOS[]; oficina?: Oficina } | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: osData, error: osError } = await supabase
        .from('ordens_servico')
        .select('*, oficinas(*)')
        .eq('id', id)
        .single();

      if (!osError && osData) {
        const { data: itensData } = await supabase
          .from('itens_os')
          .select('*')
          .eq('os_id', id);

        return {
          os: osData as OrdemServico,
          itens: (itensData || []) as ItemOS[],
          oficina: osData.oficinas as Oficina | undefined,
        };
      }
    } catch (e) {
      console.warn('Erro ao buscar OS no Supabase por id, buscando local:', e);
    }
  }

  // Fallback local
  const ordens = getLocalOrdens();
  const os = ordens.find((item) => item.id === id || item.codigo_curto.toLowerCase() === id.toLowerCase());
  if (!os) return null;

  const itens = getLocalItens().filter((item) => item.os_id === os.id);
  const oficinas = getLocalOficinas();
  const oficina = oficinas.find((of) => of.id === os.oficina_id);

  return { os, itens, oficina };
}

// 4. Upload de fotos para o bucket fotos-os
export async function uploadFotoOS(file: File): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.storage.from('fotos-os').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (!error) {
        const { data: publicUrlData } = supabase.storage.from('fotos-os').getPublicUrl(fileName);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      } else {
        console.warn('Falha no upload Supabase Storage:', error.message);
      }
    } catch (err) {
      console.warn('Erro de rede no upload Storage:', err);
    }
  }

  // Fallback demo: conversão para Data URL para funcionar visualmente sem credenciais
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}

// 5. Criar nova Ordem de Serviço
export interface NovaOSInput {
  oficina_id: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  veiculo_placa: string;
  veiculo_modelo: string;
  km_atual: number;
  fotos_entrada: string[];
  itens: Array<{ tipo: 'PECA' | 'MAO_DE_OBRA'; descricao: string; valor: number }>;
}

export async function createOrdemServico(input: NovaOSInput): Promise<{ id: string; codigo_curto: string }> {
  // Gerar código curto amigável tipo OS-5821
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const codigo_curto = `OS-${randNum}`;
  const valor_total = input.itens.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  
  // Data de retorno estimada padrão: 6 meses (180 dias)
  const retorno = new Date();
  retorno.setDate(retorno.getDate() + 180);
  const data_proximo_retorno = retorno.toISOString().split('T')[0];

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `os-${Date.now()}`;

  const novaOSRecord: OrdemServico = {
    id: newId,
    codigo_curto,
    oficina_id: input.oficina_id,
    cliente_nome: input.cliente_nome.trim(),
    cliente_whatsapp: input.cliente_whatsapp.replace(/\D/g, ''),
    veiculo_placa: input.veiculo_placa.toUpperCase().trim(),
    veiculo_modelo: input.veiculo_modelo.trim(),
    km_atual: Number(input.km_atual) || 0,
    fotos_entrada: input.fotos_entrada,
    status: 'ORCAMENTO',
    valor_total,
    aprovado_em: null,
    data_proximo_retorno,
    created_at: new Date().toISOString(),
  };

  const novosItens: ItemOS[] = input.itens.map((it, idx) => ({
    id: `item-${newId}-${idx}`,
    os_id: newId,
    tipo: it.tipo,
    descricao: it.descricao.trim(),
    valor: Number(it.valor) || 0,
  }));

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert({
          codigo_curto,
          oficina_id: input.oficina_id,
          cliente_nome: novaOSRecord.cliente_nome,
          cliente_whatsapp: novaOSRecord.cliente_whatsapp,
          veiculo_placa: novaOSRecord.veiculo_placa,
          veiculo_modelo: novaOSRecord.veiculo_modelo,
          km_atual: novaOSRecord.km_atual,
          fotos_entrada: novaOSRecord.fotos_entrada,
          status: 'ORCAMENTO',
          valor_total,
          aprovado_em: null,
          data_proximo_retorno,
        })
        .select()
        .single();

      if (!error && data) {
        const osId = data.id;
        const itensToInsert = input.itens.map((it) => ({
          os_id: osId,
          tipo: it.tipo,
          descricao: it.descricao,
          valor: it.valor,
        }));

        await supabase.from('itens_os').insert(itensToInsert);
        return { id: osId, codigo_curto: data.codigo_curto };
      }
    } catch (e) {
      console.warn('Erro ao inserir no Supabase, salvando localmente:', e);
    }
  }

  // Salvar no estado local
  const ordens = getLocalOrdens();
  ordens.unshift(novaOSRecord);
  saveLocalOrdens(ordens);

  const itens = getLocalItens();
  itens.push(...novosItens);
  saveLocalItens(itens);

  return { id: newId, codigo_curto };
}

// 6. Aprovar Orçamento (Ação pública do cliente)
export async function aprovarOrçamento(id: string): Promise<boolean> {
  const aprovadoEm = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({
          status: 'APROVADO',
          aprovado_em: aprovadoEm,
        })
        .eq('id', id);

      if (!error) return true;
    } catch (e) {
      console.warn('Erro ao aprovar no Supabase, fallback local:', e);
    }
  }

  // Fallback local
  const ordens = getLocalOrdens();
  const index = ordens.findIndex((os) => os.id === id);
  if (index !== -1) {
    ordens[index] = {
      ...ordens[index],
      status: 'APROVADO',
      aprovado_em: aprovadoEm,
    };
    saveLocalOrdens(ordens);
    return true;
  }
  return false;
}

// 7. Configurar inscrição Realtime do Supabase + canal local de fallback
export function subscribeToOrdensServico(onStatusChange: (updatedOS: Partial<OrdemServico>) => void) {
  // Listener local para eventos em tempo real
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<OrdemServico[]>;
    if (custom.detail && custom.detail.length > 0) {
      onStatusChange(custom.detail[0]);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('os_status_changed', handleLocalEvent);
  }

  // Canal Supabase Realtime oficial
  const channel = supabase
    .channel('ordens_servico_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ordens_servico',
      },
      (payload) => {
        if (payload.new) {
          onStatusChange(payload.new as OrdemServico);
        }
      }
    )
    .subscribe();

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('os_status_changed', handleLocalEvent);
    }
    supabase.removeChannel(channel);
  };
}

// 8. Helpers para mensagens de WhatsApp
export function formatWhatsAppNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('55')) return clean;
  return `55${clean}`;
}

export function generateWhatsAppRevisaoLink(os: OrdemServico, oficinaNome: string): string {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const dataFmt = os.data_proximo_retorno 
    ? new Date(os.data_proximo_retorno).toLocaleDateString('pt-BR') 
    : 'nos próximos dias';

  const texto = `Olá, *${os.cliente_nome}*! Tudo bem? 🚗🔧\n\nAqui é da *${oficinaNome}*. Notamos que está na época da revisão preventiva / troca de óleo do seu *${os.veiculo_modelo}* (Placa: ${os.veiculo_placa}).\n\nSua data programada de retorno é *${dataFmt}*.\n\nPodemos agendar um horário para você não perder a garantia e manter seu carro 100% seguro?`;
  
  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}

export function generateWhatsAppLinkParaCliente(os: { cliente_nome: string; cliente_whatsapp: string; veiculo_modelo: string; veiculo_placa: string; codigo_curto: string; id: string }, oficinaNome: string, publicUrl: string): string {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const texto = `Olá *${os.cliente_nome}*! 👋\n\nAqui é da oficina *${oficinaNome}*.\n\nSeu orçamento para o *${os.veiculo_modelo}* (Placa: *${os.veiculo_placa}*) está pronto com fotos e itens detalhados!\n\n📋 *Código*: ${os.codigo_curto}\n🔗 *Acesse e aprove online*: ${publicUrl}\n\nQualquer dúvida, estamos à disposição!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}
