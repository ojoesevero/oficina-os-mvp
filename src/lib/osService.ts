import { supabase, isSupabaseConfigured, DEMO_OFICINAS, DEMO_ORDENS_SERVICO, DEMO_ITENS_OS } from './supabase';
import { Oficina, OrdemServico, ItemOS, StatusOS, ServicoCatalogo, PlanoSaaS } from '@/types/database';

const STORAGE_KEY_OS = 'oficina_os_items_data_v1';
const STORAGE_KEY_ITEMS = 'oficina_os_itens_list_v1';
const STORAGE_KEY_OFICINAS = 'oficina_os_oficinas_v1';
const STORAGE_KEY_BRANDING = 'oficina_os_branding_v1';
const STORAGE_KEY_DELETED_OFICINAS = 'oficina_os_deleted_oficinas_v1';

function getDeletedOficinaIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_OFICINAS);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function markOficinaAsDeleted(oficinaId: string): void {
  if (typeof window === 'undefined') return;
  const set = getDeletedOficinaIds();
  set.add(oficinaId);
  localStorage.setItem(STORAGE_KEY_DELETED_OFICINAS, JSON.stringify(Array.from(set)));
}

// Paleta de cores padrão por oficina
const DEFAULT_COLORS_BY_ID: Record<string, string> = {
  '11111111-1111-1111-1111-111111111111': '#22c55e', // Verde Esmeralda (Líder)
  '22222222-2222-2222-2222-222222222222': '#f59e0b', // Âmbar Industrial (Alemão)
  '33333333-3333-3333-3333-333333333333': '#06b6d4', // Azul Ciano (CarTech)
};

function getLocalBrandingMap(): Record<string, Partial<Oficina>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANDING);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function applyBrandingToOficina(oficina: Oficina): Oficina {
  const map = getLocalBrandingMap();
  const custom = map[oficina.id];
  const demoDefault = DEMO_OFICINAS.find((d) => d.id === oficina.id);

  return {
    ...demoDefault,
    ...oficina,
    ...custom,
    nome: custom?.nome || oficina.nome,
    email: custom?.email || oficina.email || demoDefault?.email,
    whatsapp: custom?.whatsapp || oficina.whatsapp || demoDefault?.whatsapp || '',
    cnpj_cpf: custom?.cnpj_cpf !== undefined ? custom.cnpj_cpf : (oficina.cnpj_cpf ?? demoDefault?.cnpj_cpf ?? null),
    endereco: custom?.endereco !== undefined ? custom.endereco : (oficina.endereco ?? demoDefault?.endereco ?? null),
    plano: custom?.plano || oficina.plano || demoDefault?.plano || 'PRO',
    ativo: custom?.ativo !== undefined ? custom.ativo : (oficina.ativo !== undefined ? oficina.ativo : true),
    logo_url: custom?.logo_url !== undefined ? custom.logo_url : (oficina.logo_url ?? null),
    cor_primaria:
      custom?.cor_primaria ||
      oficina.cor_primaria ||
      DEFAULT_COLORS_BY_ID[oficina.id] ||
      '#22c55e',
    servicos_rapidos:
      custom?.servicos_rapidos ||
      (Array.isArray(oficina.servicos_rapidos) && oficina.servicos_rapidos.length > 0
        ? oficina.servicos_rapidos
        : demoDefault?.servicos_rapidos || []),
  };
}

// Gerador confiável de UUID v4 para compatibilidade total com tipos PostgreSQL UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

function saveLocalOrdens(ordens: OrdemServico[], updatedOS?: OrdemServico) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_OS, JSON.stringify(ordens));
    if (updatedOS) {
      window.dispatchEvent(new CustomEvent('os_single_changed', { detail: updatedOS }));
    }
  }
}

function saveLocalItens(itens: ItemOS[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(itens));
  }
}

// 1. Obter todas as oficinas cadastradas (mesclando Supabase + cadastros/edições locais do Admin e respeitando exclusões)
export async function fetchOficinas(): Promise<Oficina[]> {
  const deletedIds = getDeletedOficinaIds();
  const locais = getLocalOficinas().filter((o) => !deletedIds.has(o.id));

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('oficinas').select('*').order('nome');
      if (!error && data && data.length > 0) {
        const dbList = (data as Oficina[])
          .filter((o) => !deletedIds.has(o.id))
          .map(applyBrandingToOficina);
        const dbIds = new Set(dbList.map((o) => o.id));
        const extrasLocais = locais.filter((o) => !dbIds.has(o.id)).map(applyBrandingToOficina);
        return [...dbList, ...extrasLocais];
      }
    } catch (e) {
      console.warn('Erro ao buscar oficinas no Supabase, usando dados locais:', e);
    }
  }
  return locais.map(applyBrandingToOficina);
}

// 1.1 Atualizar Logotipo Individual, Cor Padrão e Dados da Oficina
export async function updateOficinaBranding(
  oficinaId: string,
  updates: Partial<Oficina>
): Promise<Oficina | null> {
  if (typeof window !== 'undefined') {
    const map = getLocalBrandingMap();
    map[oficinaId] = {
      ...map[oficinaId],
      ...updates,
    };
    localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(map));

    const locais = getLocalOficinas();
    const idx = locais.findIndex((o) => o.id === oficinaId);
    if (idx !== -1) {
      locais[idx] = { ...locais[idx], ...updates };
      localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(locais));
    }
  }

  if (isSupabaseConfigured) {
    try {
      const fullPayload: Record<string, unknown> = {};
      if (updates.nome !== undefined) fullPayload.nome = updates.nome;
      if (updates.whatsapp !== undefined) fullPayload.whatsapp = updates.whatsapp;
      if (updates.email !== undefined) fullPayload.email = updates.email;
      if (updates.cnpj_cpf !== undefined) fullPayload.cnpj_cpf = updates.cnpj_cpf;
      if (updates.endereco !== undefined) fullPayload.endereco = updates.endereco;
      if (updates.logo_url !== undefined) fullPayload.logo_url = updates.logo_url;
      if (updates.cor_primaria !== undefined) fullPayload.cor_primaria = updates.cor_primaria;
      if (updates.plano !== undefined) fullPayload.plano = updates.plano;
      if (updates.ativo !== undefined) fullPayload.ativo = updates.ativo;
      if (updates.servicos_rapidos !== undefined) fullPayload.servicos_rapidos = updates.servicos_rapidos;

      const { error } = await supabase.from('oficinas').update(fullPayload).eq('id', oficinaId);
      if (error) {
        // Fallback caso alguma coluna nova ainda não tenha sido migrada no banco
        await supabase
          .from('oficinas')
          .update({
            ...(updates.nome ? { nome: updates.nome } : {}),
            ...(updates.whatsapp ? { whatsapp: updates.whatsapp } : {}),
          })
          .eq('id', oficinaId);
      }
    } catch (e) {
      logEventoOS('WARN', 'aviso_update_branding_supabase', { oficinaId, erro: String(e) });
    }
  }

  const todas = await fetchOficinas();
  return todas.find((o) => o.id === oficinaId) || null;
}

// 1.2 [SUPER ADMIN] Cadastrar Nova Oficina ou Editar Oficina Existente
export interface AdminOficinaInput {
  id?: string;
  nome: string;
  email: string;
  senha_acesso?: string;
  whatsapp: string;
  cnpj_cpf?: string;
  endereco?: string;
  logo_url?: string | null;
  cor_primaria?: string;
  plano?: PlanoSaaS;
  ativo?: boolean;
  servicos_rapidos?: ServicoCatalogo[];
}

export async function saveOficinaAdmin(input: AdminOficinaInput): Promise<Oficina> {
  const isEditing = Boolean(input.id);
  const targetId = input.id || generateUUID();

  const defaultCatalogo: ServicoCatalogo[] = [
    { tipo: 'PECA', descricao: 'Óleo Motor 5W30 Sintético (4L)', valor: 260 },
    { tipo: 'PECA', descricao: 'Filtro de Óleo + Filtro de Combustível', valor: 95 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Serviço Técnico: Revisão Básica e Troca de Filtros', valor: 150 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Serviço Técnico: Diagnóstico Eletrônico Scanner', valor: 120 },
  ];

  const record: Oficina = {
    id: targetId,
    nome: input.nome.trim(),
    email: input.email.trim().toLowerCase(),
    ...(input.senha_acesso ? { senha_acesso: input.senha_acesso } : {}),
    whatsapp: input.whatsapp.replace(/\D/g, ''),
    cnpj_cpf: input.cnpj_cpf?.trim() || null,
    endereco: input.endereco?.trim() || null,
    logo_url: input.logo_url ?? null,
    cor_primaria: input.cor_primaria || '#22c55e',
    plano: input.plano || 'PRO',
    ativo: input.ativo !== undefined ? input.ativo : true,
    servicos_rapidos: input.servicos_rapidos || defaultCatalogo,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const locais = getLocalOficinas();
    const idx = locais.findIndex((o) => o.id === targetId);
    if (idx !== -1) {
      locais[idx] = {
        ...locais[idx],
        ...record,
        senha_acesso: input.senha_acesso || locais[idx].senha_acesso,
      };
    } else {
      locais.push(record);
    }
    localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(locais));

    const map = getLocalBrandingMap();
    map[targetId] = {
      ...map[targetId],
      ...record,
      senha_acesso: input.senha_acesso || map[targetId]?.senha_acesso,
    };
    localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(map));
  }

  if (isSupabaseConfigured) {
    try {
      if (isEditing) {
        await updateOficinaBranding(targetId, record);
      } else {
        const { error } = await supabase.from('oficinas').insert({
          id: record.id,
          nome: record.nome,
          email: record.email,
          whatsapp: record.whatsapp,
          cnpj_cpf: record.cnpj_cpf,
          endereco: record.endereco,
          logo_url: record.logo_url,
          cor_primaria: record.cor_primaria,
          plano: record.plano,
          ativo: record.ativo,
          servicos_rapidos: record.servicos_rapidos,
        });
        if (error) {
          // Fallback caso banco tenha apenas colunas originais
          await supabase.from('oficinas').insert({
            id: record.id,
            nome: record.nome,
            whatsapp: record.whatsapp,
          });
        }
      }
      logEventoOS('INFO', isEditing ? 'admin_oficina_atualizada' : 'admin_oficina_criada', {
        oficinaId: record.id,
        nome: record.nome,
      });
    } catch (e) {
      logEventoOS('WARN', 'aviso_salvar_oficina_admin_supabase', { erro: String(e) });
    }
  }

  return applyBrandingToOficina(record);
}

// 1.3 [SUPER ADMIN] Atualizar catálogo de Serviços Técnicos e Peças de uma oficina
export async function updateServicosOficinaAdmin(
  oficinaId: string,
  servicos: ServicoCatalogo[]
): Promise<Oficina | null> {
  return updateOficinaBranding(oficinaId, { servicos_rapidos: servicos });
}

// 1.4 [SUPER ADMIN] Excluir Oficina (Manutenção com cascata e bloqueio permanente de retorno)
export async function deleteOficinaAdmin(oficinaId: string): Promise<boolean> {
  // 1. Registra a exclusão permanentemente para que não retorne mesmo se houver seed no banco
  markOficinaAsDeleted(oficinaId);

  if (typeof window !== 'undefined') {
    const locais = getLocalOficinas().filter((o) => o.id !== oficinaId);
    localStorage.setItem(STORAGE_KEY_OFICINAS, JSON.stringify(locais));

    // Remove ordens e itens vinculados localmente
    const ordensDaOficina = getLocalOrdens().filter((os) => os.oficina_id === oficinaId);
    const osIdsRemovidos = new Set(ordensDaOficina.map((os) => os.id));
    const ordensRestantes = getLocalOrdens().filter((os) => os.oficina_id !== oficinaId);
    saveLocalOrdens(ordensRestantes);

    const itensRestantes = getLocalItens().filter((it) => !osIdsRemovidos.has(it.os_id));
    saveLocalItens(itensRestantes);

    const map = getLocalBrandingMap();
    delete map[oficinaId];
    localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(map));
  }

  if (isSupabaseConfigured) {
    try {
      // Remove ordens vinculadas primeiro para não esbarrar em Foreign Key constraint
      const { data: ordensDb } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('oficina_id', oficinaId);

      if (ordensDb && ordensDb.length > 0) {
        const ids = ordensDb.map((o) => o.id);
        await supabase.from('itens_os').delete().in('os_id', ids);
        await supabase.from('ordens_servico').delete().eq('oficina_id', oficinaId);
      }

      await supabase.from('oficinas').delete().eq('id', oficinaId);
    } catch (e) {
      logEventoOS('WARN', 'aviso_delete_oficina_supabase', { oficinaId, erro: String(e) });
    }
  }

  logEventoOS('INFO', 'admin_oficina_excluida', { oficinaId });
  return true;
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

// 3. Obter uma OS completa por ID (via RPC isolada ou consulta direta por UUID)
export async function fetchOrdemServicoById(id: string): Promise<{ os: OrdemServico; itens: ItemOS[]; oficina?: Oficina } | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('obter_os_publica', {
        p_os_id: id,
      });

      if (!rpcError && rpcData && rpcData.os) {
        return {
          os: rpcData.os as OrdemServico,
          itens: (rpcData.itens || []) as ItemOS[],
          oficina: rpcData.oficina ? applyBrandingToOficina(rpcData.oficina as Oficina) : undefined,
        };
      }

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
          oficina: osData.oficinas ? applyBrandingToOficina(osData.oficinas as Oficina) : undefined,
        };
      }
    } catch (e) {
      logEventoOS('WARN', 'erro_buscar_os_por_id_supabase', { id, erro: String(e) });
    }
  }

  // Fallback local: busca estritamente pelo ID seguro para evitar enumeração de ordens
  const ordens = getLocalOrdens();
  const os = ordens.find((item) => item.id === id);
  if (!os) return null;

  const itens = getLocalItens().filter((item) => item.os_id === os.id);
  const oficinas = getLocalOficinas();
  const oficina = oficinas.find((of) => of.id === os.oficina_id);

  return { os, itens, oficina: oficina ? applyBrandingToOficina(oficina) : undefined };
}

// 3.1 Buscar itens de uma OS específica (para edição / adição de itens pelo mecânico)
export async function fetchItensByOSId(osId: string): Promise<ItemOS[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('itens_os')
        .select('*')
        .eq('os_id', osId);
      if (!error && data && data.length > 0) {
        return data as ItemOS[];
      }
    } catch {
      // fallback local
    }
  }
  return getLocalItens().filter((item) => item.os_id === osId);
}

// 3.2 Adicionar / Editar Itens de uma OS (mesmo após aprovada) e retornar status para ORCAMENTO (Reaprovação)
export async function atualizarItensEReenviarOS(
  osId: string,
  novosItens: Array<{ tipo: 'PECA' | 'MAO_DE_OBRA'; descricao: string; valor: number }>
): Promise<OrdemServico | null> {
  const novoValorTotal = novosItens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);

  // Atualizar itens e OS localmente para resposta instantânea
  const todosItensLocais = getLocalItens().filter((it) => it.os_id !== osId);
  const itensFormatados: ItemOS[] = novosItens.map((it, idx) => ({
    id: `item-${osId}-${Date.now()}-${idx}`,
    os_id: osId,
    tipo: it.tipo,
    descricao: it.descricao.trim(),
    valor: Number(it.valor) || 0,
  }));
  todosItensLocais.push(...itensFormatados);
  saveLocalItens(todosItensLocais);

  let updatedRecord: OrdemServico | null = null;
  const ordensLocais = getLocalOrdens();
  const osIndex = ordensLocais.findIndex((o) => o.id === osId);
  if (osIndex !== -1) {
    updatedRecord = {
      ...ordensLocais[osIndex],
      valor_total: novoValorTotal,
      status: 'ORCAMENTO',
      aprovado_em: null,
      aprovado_dispositivo: null,
    };
    ordensLocais[osIndex] = updatedRecord;
    saveLocalOrdens(ordensLocais, updatedRecord);
  }

  // Sincronizar com Supabase se configurado
  if (isSupabaseConfigured) {
    try {
      await supabase.from('itens_os').delete().eq('os_id', osId);
      const itensInsert = novosItens.map((it) => ({
        os_id: osId,
        tipo: it.tipo,
        descricao: it.descricao.trim(),
        valor: Number(it.valor) || 0,
      }));
      await supabase.from('itens_os').insert(itensInsert);

      const { data: updatedData, error: updateErr } = await supabase
        .from('ordens_servico')
        .update({
          valor_total: novoValorTotal,
          status: 'ORCAMENTO',
          aprovado_em: null,
        })
        .eq('id', osId)
        .select()
        .single();

      if (!updateErr && updatedData) {
        updatedRecord = updatedData as OrdemServico;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('os_single_changed', { detail: updatedRecord }));
        }
      }
      logEventoOS('INFO', 'os_itens_adicionados_reenvio_aprovacao', {
        osId,
        qtdItens: novosItens.length,
        novoValorTotal,
      });
    } catch (e) {
      logEventoOS('WARN', 'erro_sincronizar_adicionais_supabase', { osId, erro: String(e) });
    }
  }

  return updatedRecord;
}

// Logger estruturado leve para observabilidade na Vercel sem dependências pesadas
export function logEventoOS(
  nivel: 'INFO' | 'WARN' | 'ERROR',
  acao: string,
  detalhes?: Record<string, unknown>
) {
  const payload = {
    ts: new Date().toISOString(),
    app: 'js-orcafacil',
    nivel,
    acao,
    ...detalhes,
  };
  if (nivel === 'ERROR') {
    console.error('[JS-OrcaFacil]', JSON.stringify(payload));
  } else if (nivel === 'WARN') {
    console.warn('[JS-OrcaFacil]', JSON.stringify(payload));
  } else {
    console.info('[JS-OrcaFacil]', JSON.stringify(payload));
  }
}

// Helper de Auditoria: identifica o dispositivo/navegador do cliente de forma legível
export function detectarDispositivoCliente(ua?: string): string {
  const rawUA = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!rawUA) return 'Dispositivo Web Verificado';

  let os = 'Dispositivo';
  if (/iPhone|iPad|iPod/i.test(rawUA)) os = 'iPhone (iOS)';
  else if (/Android/i.test(rawUA)) os = 'Smartphone Android';
  else if (/Windows/i.test(rawUA)) os = 'Computador Windows';
  else if (/Macintosh|Mac OS/i.test(rawUA)) os = 'Mac (macOS)';
  else if (/Linux/i.test(rawUA)) os = 'Linux';

  let browser = 'Navegador';
  if (/Edg\//i.test(rawUA)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(rawUA)) browser = 'Opera';
  else if (/Chrome\//i.test(rawUA) && !/Edg\//i.test(rawUA)) browser = 'Chrome';
  else if (/Safari\//i.test(rawUA) && !/Chrome\//i.test(rawUA)) browser = 'Safari';
  else if (/Firefox\//i.test(rawUA)) browser = 'Firefox';

  return `${os} • ${browser}`;
}

// Gera um código de protocolo de auditoria determinístico a partir do ID da OS e timestamp de aprovação
export function gerarHashAuditoria(osId: string, aprovadoEm: string): string {
  const base = `${osId}|${aprovadoEm}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `AUD-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

// Compressão automática Client-Side via <canvas> nativo para WebP (reduz fotos de 5-10MB para ~90KB)
export async function compressImageToWebP(
  file: File,
  maxDimension = 1280,
  quality = 0.78
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const compressedFile = new File([blob], `${cleanBaseName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            logEventoOS('INFO', 'foto_comprimida_webp', {
              originalKB: Math.round(file.size / 1024),
              comprimidoKB: Math.round(compressedFile.size / 1024),
              reducaoPct: Math.round((1 - compressedFile.size / Math.max(file.size, 1)) * 100),
            });
            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

// 4. Upload de fotos para o bucket fotos-os (com compressão WebP automática no navegador)
export async function uploadFotoOS(file: File): Promise<string> {
  const optimizedFile = await compressImageToWebP(file);
  const ext = optimizedFile.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${baseName}.${ext}`;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.storage.from('fotos-os').upload(fileName, optimizedFile, {
        cacheControl: '3600',
        contentType: optimizedFile.type || 'image/webp',
        upsert: false,
      });

      if (!error) {
        const { data: publicUrlData } = supabase.storage.from('fotos-os').getPublicUrl(fileName);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      } else {
        logEventoOS('WARN', 'falha_upload_supabase_storage', { erro: error.message, fileName });
      }
    } catch (err) {
      logEventoOS('WARN', 'erro_rede_upload_storage', { erro: String(err) });
    }
  }

  // Fallback demo: conversão do arquivo já comprimido para Data URL leve
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(optimizedFile);
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

  const newId = generateUUID();

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
  saveLocalOrdens(ordens, novaOSRecord);

  const itens = getLocalItens();
  itens.push(...novosItens);
  saveLocalItens(itens);

  return { id: newId, codigo_curto };
}

// 6. Atualizar Status de uma Ordem de Serviço (Transição Rápida no Pátio ou Aprovação com Auditoria)
export async function updateOrdemServicoStatus(
  id: string,
  newStatus: StatusOS,
  dispositivoAudit?: string
): Promise<boolean> {
  const aprovadoEm = newStatus === 'APROVADO' ? new Date().toISOString() : undefined;
  const dispositivo = newStatus === 'APROVADO' ? (dispositivoAudit || detectarDispositivoCliente()) : undefined;

  // Sempre registra nos dados locais de fallback/cache para exibição imediata
  const ordens = getLocalOrdens();
  const index = ordens.findIndex((os) => os.id === id);
  if (index !== -1) {
    const updated: OrdemServico = {
      ...ordens[index],
      status: newStatus,
      aprovado_em: aprovadoEm || (newStatus === 'ORCAMENTO' ? null : ordens[index].aprovado_em),
      aprovado_dispositivo: dispositivo || (newStatus === 'ORCAMENTO' ? null : ordens[index].aprovado_dispositivo),
    };
    ordens[index] = updated;
    saveLocalOrdens(ordens, updated);
  }

  if (isSupabaseConfigured) {
    try {
      // Tenta gravar incluindo trilha de auditoria do dispositivo
      const payloadWithAudit: Record<string, unknown> = { status: newStatus };
      if (aprovadoEm) payloadWithAudit.aprovado_em = aprovadoEm;
      if (dispositivo) payloadWithAudit.aprovado_dispositivo = dispositivo;

      const { error } = await supabase
        .from('ordens_servico')
        .update(payloadWithAudit)
        .eq('id', id);

      if (!error) {
        logEventoOS('INFO', 'status_os_atualizado', { id, status: newStatus, dispositivo });
        return true;
      }

      // Fallback automático caso a coluna aprovado_dispositivo ainda não tenha sido criada no banco antigo
      const payloadBasic: { status: StatusOS; aprovado_em?: string } = { status: newStatus };
      if (aprovadoEm) payloadBasic.aprovado_em = aprovadoEm;

      const { error: fallbackErr } = await supabase
        .from('ordens_servico')
        .update(payloadBasic)
        .eq('id', id);

      if (!fallbackErr) {
        logEventoOS('INFO', 'status_os_atualizado_sem_coluna_audit', { id, status: newStatus });
        return true;
      }

      logEventoOS('WARN', 'falha_atualizar_status_supabase', { id, erro: fallbackErr.message });
    } catch (e) {
      logEventoOS('ERROR', 'excecao_atualizar_status_supabase', { id, erro: String(e) });
    }
  }

  return index !== -1;
}

// 7. Aprovar Orçamento (Ação pública do cliente com Trilha de Auditoria)
export async function aprovarOrçamento(id: string): Promise<{
  ok: boolean;
  aprovado_em: string;
  aprovado_dispositivo: string;
  protocolo: string;
}> {
  const aprovado_em = new Date().toISOString();
  const aprovado_dispositivo = detectarDispositivoCliente();
  const protocolo = gerarHashAuditoria(id, aprovado_em);

  // Caso exista a RPC blindada no Supabase, tenta usá-la primeiro; se não existir, usa o update padrão
  if (isSupabaseConfigured) {
    try {
      const { error: rpcError } = await supabase.rpc('aprovar_orcamento_publico', {
        p_os_id: id,
        p_dispositivo: `${aprovado_dispositivo} [${protocolo}]`,
      });
      if (!rpcError) {
        logEventoOS('INFO', 'orcamento_aprovado_via_rpc', { id, aprovado_dispositivo, protocolo });
        await updateOrdemServicoStatus(id, 'APROVADO', `${aprovado_dispositivo} [${protocolo}]`);
        return { ok: true, aprovado_em, aprovado_dispositivo, protocolo };
      }
    } catch {
      // prossegue para update padrão se RPC não estiver instalada
    }
  }

  const ok = await updateOrdemServicoStatus(id, 'APROVADO', `${aprovado_dispositivo} [${protocolo}]`);
  logEventoOS('INFO', 'orcamento_aprovado_cliente', { id, ok, aprovado_dispositivo, protocolo });
  return { ok, aprovado_em, aprovado_dispositivo, protocolo };
}

// 7. Configurar inscrição Realtime do Supabase + canal local de fallback
export function subscribeToOrdensServico(onStatusChange: (updatedOS: Partial<OrdemServico>) => void) {
  // Listener local para eventos em tempo real direcionados ao registro exato
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<OrdemServico>;
    if (custom.detail) {
      onStatusChange(custom.detail);
    }
  };

  // Suporte a alterações originadas em outra aba (ex: cliente aprovou em aba separada)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_OS && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as OrdemServico[];
        if (parsed.length > 0) {
          // Dispara para o primeiro ou alterado
          onStatusChange(parsed[0]);
        }
      } catch {
        // ignore parse error
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('os_single_changed', handleLocalEvent);
    window.addEventListener('storage', handleStorageEvent);
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
      window.removeEventListener('os_single_changed', handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
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

export function generateWhatsAppLinkParaCliente(
  os: { cliente_nome: string; cliente_whatsapp: string; veiculo_modelo: string; veiculo_placa: string; codigo_curto: string; id: string },
  oficinaNome: string,
  publicUrl: string,
  isReenvioAdicional = false
): string {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const texto = isReenvioAdicional
    ? `Olá *${os.cliente_nome}*! 🔧\n\nAqui é da oficina *${oficinaNome}*.\n\nAtualizamos o orçamento do seu *${os.veiculo_modelo}* (Placa: *${os.veiculo_placa}*) com novos itens identificados na avaliação técnica.\n\n📋 *Código*: ${os.codigo_curto}\n🔗 *Confira os itens atualizados e aprove online*: ${publicUrl}\n\nQualquer dúvida, estamos à disposição!`
    : `Olá *${os.cliente_nome}*! 👋\n\nAqui é da oficina *${oficinaNome}*.\n\nSeu orçamento para o *${os.veiculo_modelo}* (Placa: *${os.veiculo_placa}*) está pronto com fotos e itens detalhados!\n\n📋 *Código*: ${os.codigo_curto}\n🔗 *Acesse e aprove online*: ${publicUrl}\n\nQualquer dúvida, estamos à disposição!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}

// 8.1 Link de WhatsApp para avisar ao cliente que o Veículo está PRONTO para Retirada
export function generateWhatsAppVeiculoProntoLink(
  os: {
    cliente_nome: string;
    cliente_whatsapp: string;
    veiculo_modelo: string;
    veiculo_placa: string;
    codigo_curto: string;
    valor_total: number;
    id: string;
  },
  oficinaNome: string,
  publicUrl: string
): string {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const valorFmt = Number(os.valor_total || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const texto = `Olá *${os.cliente_nome}*! 🚗✨\n\nBoa notícia! Aqui é da oficina *${oficinaNome}*.\n\nO serviço no seu *${os.veiculo_modelo}* (Placa: *${os.veiculo_placa}*) foi *CONCLUÍDO* e seu veículo já está *PRONTO PARA RETIRADA*!\n\n📋 *Ordem de Serviço*: #${os.codigo_curto}\n💰 *Valor Total*: R$ ${valorFmt}\n🔗 *Confira o resumo do serviço realizado e termo de garantia*: ${publicUrl}\n\nEstamos te aguardando!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}
