'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  Car, 
  Clock, 
  Plus, 
  ExternalLink, 
  MessageCircle, 
  Calendar, 
  Search, 
  Sparkles, 
  LogOut, 
  Bell, 
  LayoutDashboard, 
  Check, 
  FileText,
  User,
  ChevronDown,
  Trash2,
  Package,
  X,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { OrdemServico, StatusOS } from '@/types/database';
import { 
  fetchOficinas,
  fetchOrdensServico, 
  fetchItensByOSId,
  atualizarItensEReenviarOS,
  subscribeToOrdensServico, 
  generateWhatsAppLinkParaCliente, 
  generateWhatsAppVeiculoProntoLink,
  generateWhatsAppRevisaoLink,
  updateOrdemServicoStatus
} from '@/lib/osService';
import { 
  useCurrentOficina, 
  useIsHydrated, 
  setCurrentOficina,
  logoutOficina,
  isSuperAdminAuthenticated
} from '@/lib/authService';
import PitTrackLogo from '@/components/PitTrackLogo';

type FilterTab = 'ALL' | 'ORCAMENTO' | 'EM_SERVICO' | 'APROVADO' | 'FINALIZADO' | 'ALERTAS';

const SUGESTOES_ADICIONAIS = [
  { tipo: 'PECA' as const, descricao: 'Aditivo de Radiador Orgânico Concentrado', valor: 85 },
  { tipo: 'PECA' as const, descricao: 'Filtro de Cabine / Ar-Condicionado', valor: 65 },
  { tipo: 'PECA' as const, descricao: 'Jogo de Buchas da Bandeja Dianteira', valor: 190 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Limpeza do Sistema de Arrefecimento', valor: 160 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Alinhamento 3D + Balanceamento', valor: 140 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Diagnóstico Eletrônico Scanner', valor: 120 },
];

export default function DashboardPage() {
  const router = useRouter();
  const currentOficina = useCurrentOficina();
  const isHydrated = useIsHydrated();

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  // Modal de Adição de Itens e Reenvio para Aprovação (Pós-Aprovação)
  const [editingOS, setEditingOS] = useState<OrdemServico | null>(null);
  const [editingItens, setEditingItens] = useState<Array<{ tipo: 'PECA' | 'MAO_DE_OBRA'; descricao: string; valor: number }>>([]);
  const [isLoadingItens, setIsLoadingItens] = useState(false);
  const [novoItemTipo, setNovoItemTipo] = useState<'PECA' | 'MAO_DE_OBRA'>('PECA');
  const [novoItemDesc, setNovoItemDesc] = useState('');
  const [novoItemValor, setNovoItemValor] = useState('');
  const [isSavingItens, setIsSavingItens] = useState(false);

  // Modal de Veículo Pronto para Retirada (quando status muda para FINALIZADO)
  const [prontoOS, setProntoOS] = useState<OrdemServico | null>(null);
  const [copiedProntoLink, setCopiedProntoLink] = useState(false);

  const brandColor = currentOficina?.cor_primaria || '#22c55e';
  const isAdminSession = isHydrated && isSuperAdminAuthenticated();
  const catalogoAdicionais =
    currentOficina?.servicos_rapidos && currentOficina.servicos_rapidos.length > 0
      ? currentOficina.servicos_rapidos
      : SUGESTOES_ADICIONAIS;

  // 1. Redirecionar para login caso não autenticado após hidratação
  useEffect(() => {
    if (isHydrated && !currentOficina) {
      router.replace('/login');
    }
  }, [isHydrated, currentOficina, router]);

  // 1.1 Sincronizar identidade visual (logo, cor e catálogo de serviços) da oficina logada
  useEffect(() => {
    if (!isHydrated || !currentOficina) return;
    fetchOficinas().then((lista) => {
      const atualizada = lista.find((o) => o.id === currentOficina.id);
      if (atualizada && JSON.stringify(atualizada) !== JSON.stringify(currentOficina)) {
        setCurrentOficina(atualizada);
      }
    });
  }, [isHydrated, currentOficina]);

  // 2. Carregar ordens estritamente da oficina autenticada
  useEffect(() => {
    if (!currentOficina?.id) return;

    let isMounted = true;
    async function loadOrdens() {
      setIsLoading(true);
      const data = await fetchOrdensServico(currentOficina!.id);
      if (isMounted) {
        setOrdens(data);
        setIsLoading(false);
      }
    }
    loadOrdens();

    // Inscrever no Realtime isolado para esta oficina
    const unsubscribe = subscribeToOrdensServico((updatedOS) => {
      if (updatedOS.oficina_id && updatedOS.oficina_id !== currentOficina.id) {
        return;
      }

      if (updatedOS.status === 'APROVADO') {
        setRealtimeNotification(`A OS ${updatedOS.codigo_curto || ''} foi APROVADA pelo cliente!`);
        setTimeout(() => setRealtimeNotification(null), 6000);
      }

      setOrdens((prev) => {
        const exists = prev.some((o) => o.id === updatedOS.id);
        if (exists) {
          return prev.map((o) => (o.id === updatedOS.id ? { ...o, ...updatedOS } as OrdemServico : o));
        } else if (!updatedOS.oficina_id || updatedOS.oficina_id === currentOficina.id) {
          return [updatedOS as OrdemServico, ...prev];
        }
        return prev;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentOficina]);

  // Abrir modal de Adição de Itens / Reenvio para Aprovação
  const handleOpenEditItensModal = async (os: OrdemServico) => {
    setEditingOS(os);
    setIsLoadingItens(true);
    setNovoItemDesc('');
    setNovoItemValor('');
    try {
      const itensAtuais = await fetchItensByOSId(os.id);
      setEditingItens(
        itensAtuais.map((it) => ({
          tipo: it.tipo,
          descricao: it.descricao,
          valor: Number(it.valor),
        }))
      );
    } finally {
      setIsLoadingItens(false);
    }
  };

  const handleAddNovoItemModal = () => {
    if (!novoItemDesc.trim()) return;
    const val = parseFloat(novoItemValor.replace(',', '.')) || 0;
    if (val <= 0) return;

    setEditingItens((prev) => [
      ...prev,
      {
        tipo: novoItemTipo,
        descricao: novoItemDesc.trim(),
        valor: val,
      },
    ]);
    setNovoItemDesc('');
    setNovoItemValor('');
  };

  const handleRemoveItemModal = (idx: number) => {
    setEditingItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSalvarEReenviarOS = async (abrirWhatsApp: boolean) => {
    if (!editingOS || !currentOficina || editingItens.length === 0) return;
    setIsSavingItens(true);
    try {
      const updated = await atualizarItensEReenviarOS(editingOS.id, editingItens);
      const novoTotal = editingItens.reduce((acc, it) => acc + Number(it.valor), 0);

      setOrdens((prev) =>
        prev.map((o) =>
          o.id === editingOS.id
            ? {
                ...o,
                ...(updated || {}),
                valor_total: novoTotal,
                status: 'ORCAMENTO',
                aprovado_em: null,
              }
            : o
        )
      );

      if (abrirWhatsApp) {
        const publicUrl = `${window.location.origin}/os/${editingOS.id}`;
        const whatsLink = generateWhatsAppLinkParaCliente(
          {
            cliente_nome: editingOS.cliente_nome,
            cliente_whatsapp: editingOS.cliente_whatsapp,
            veiculo_modelo: editingOS.veiculo_modelo,
            veiculo_placa: editingOS.veiculo_placa,
            codigo_curto: editingOS.codigo_curto,
            id: editingOS.id,
          },
          currentOficina.nome,
          publicUrl,
          true
        );
        window.open(whatsLink, '_blank');
      }

      setRealtimeNotification(
        `OS #${editingOS.codigo_curto} atualizada com novos itens e reaberta para aprovação!`
      );
      setTimeout(() => setRealtimeNotification(null), 5000);
      setEditingOS(null);
    } finally {
      setIsSavingItens(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair da oficina?')) {
      await logoutOficina();
      router.replace('/login');
    }
  };

  // Contagens para os filtros
  const countAll = ordens.length;
  const countOpen = ordens.filter((o) => o.status === 'ORCAMENTO').length;
  const countInProgress = ordens.filter((o) => o.status === 'EM_SERVICO').length;
  const countPartsOrdered = ordens.filter((o) => o.status === 'APROVADO').length;
  const countCompleted = ordens.filter((o) => o.status === 'FINALIZADO').length;

  // Alertas de Retorno (6 meses)
  const alertasRetorno = useMemo(() => {
    if (!isHydrated) return [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return ordens.filter((os) => {
      if (!os.data_proximo_retorno) return false;
      const dataRet = new Date(os.data_proximo_retorno);
      dataRet.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dataRet.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 15;
    }).map((os) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataRet = new Date(os.data_proximo_retorno!);
      dataRet.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dataRet.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...os,
        diffDays,
        isVencido: diffDays < 0,
      };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [ordens, isHydrated]);

  // Ordens filtradas
  const filteredOrdens = useMemo(() => {
    return ordens.filter((os) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        os.veiculo_placa.toLowerCase().includes(q) ||
        os.veiculo_modelo.toLowerCase().includes(q) ||
        os.cliente_nome.toLowerCase().includes(q) ||
        os.codigo_curto.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeTab === 'ALL') return true;
      if (activeTab === 'ORCAMENTO') return os.status === 'ORCAMENTO';
      if (activeTab === 'EM_SERVICO') return os.status === 'EM_SERVICO';
      if (activeTab === 'APROVADO') return os.status === 'APROVADO';
      if (activeTab === 'FINALIZADO') return os.status === 'FINALIZADO';
      return true;
    });
  }, [ordens, searchQuery, activeTab]);

  // Cálculos de Totais (Serviço Técnico vs. Peças)
  const totalGeral = ordens.reduce((s, o) => s + (Number(o.valor_total) || 0), 0);
  const totalServicoTecnicoEst = totalGeral * 0.45;
  const totalPecasEst = totalGeral * 0.50;
  const totalOutrosEst = totalGeral * 0.05;

  // Transição rápida de status no pátio com feedback imediato e geração de link de Veículo Pronto
  const handleUpdateStatus = async (id: string, codigo: string, newStatus: StatusOS) => {
    const targetOS = ordens.find((o) => o.id === id) || null;
    setOrdens((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );

    const ok = await updateOrdemServicoStatus(id, newStatus);
    if (ok) {
      if (newStatus === 'FINALIZADO' && targetOS) {
        setCopiedProntoLink(false);
        setProntoOS({ ...targetOS, status: 'FINALIZADO' });
        setRealtimeNotification(`OS #${codigo} marcada como PRONTA! Envie o link de retirada ao cliente.`);
      } else {
        setRealtimeNotification(`Status da OS ${codigo} alterado para "${newStatus}"!`);
      }
      setTimeout(() => setRealtimeNotification(null), 5000);
    }
  };

  // Seletor Interativo de Status com Transição Rápida
  const renderStatusBadge = (os: OrdemServico) => {
    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <select
          value={os.status}
          onChange={(e) => handleUpdateStatus(os.id, os.codigo_curto, e.target.value as StatusOS)}
          className={`appearance-none cursor-pointer text-xs font-bold px-2.5 py-1 pr-6 rounded-full border transition-all focus:outline-none ${
            os.status === 'ORCAMENTO'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : os.status === 'APROVADO'
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25'
              : os.status === 'EM_SERVICO'
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25'
              : os.status === 'FINALIZADO'
              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          }`}
          title="Clique para transição rápida de status"
        >
          <option value="ORCAMENTO" className="bg-[#0e1724] text-emerald-400">
            ● Orçamento (Aberto)
          </option>
          <option value="APROVADO" className="bg-[#0e1724] text-purple-400">
            ● Aprovado (Aguardando Peças)
          </option>
          <option value="EM_SERVICO" className="bg-[#0e1724] text-sky-400">
            ● Em Serviço (Na Oficina)
          </option>
          <option value="FINALIZADO" className="bg-[#0e1724] text-slate-300">
            ● Finalizado (Pronto)
          </option>
          <option value="CANCELADO" className="bg-[#0e1724] text-rose-400">
            ● Cancelado
          </option>
        </select>
        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    );
  };

  if (!isHydrated || !currentOficina) {
    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center animate-spin mb-4 border border-emerald-500/20">
          <Wrench className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-200">Carregando JS OrçaFácil...</p>
      </div>
    );
  }

  const totalModalItens = editingItens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex selection:bg-emerald-500 selection:text-[#080d14]">
      
      {/* Toast Notificação Realtime */}
      {realtimeNotification && (
        <div
          style={{ backgroundColor: brandColor }}
          className="fixed top-4 right-4 z-50 max-w-sm text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300"
        >
          <Sparkles className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <span className="text-xs">{realtimeNotification}</span>
        </div>
      )}

      {/* =========================================================================
          1. DESKTOP SIDEBAR (Esquerda - Com Logo Individual, Cor e Troca de Oficinas)
      ========================================================================= */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0b121b] border-r border-[#1c2e42] flex-shrink-0 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo Individual da Oficina Ativa */}
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="block min-w-0">
              <PitTrackLogo
                size="md"
                logoUrl={currentOficina.logo_url}
                corPrimaria={brandColor}
                nomeOficina={currentOficina.nome}
              />
            </Link>
          </div>

          {/* Menu de Navegação */}
          <nav className="space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('ALL')}
              style={
                activeTab === 'ALL'
                  ? {
                      backgroundColor: `${brandColor}18`,
                      color: brandColor,
                      borderColor: `${brandColor}40`,
                    }
                  : undefined
              }
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border ${
                activeTab === 'ALL'
                  ? 'font-bold'
                  : 'border-transparent text-[#8b9eb0] hover:text-white hover:bg-[#111e2e]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Painel Principal</span>
            </button>

            <button
              onClick={() => setActiveTab('ORCAMENTO')}
              style={
                activeTab !== 'ALL' && activeTab !== 'ALERTAS'
                  ? {
                      backgroundColor: `${brandColor}18`,
                      color: brandColor,
                      borderColor: `${brandColor}40`,
                    }
                  : undefined
              }
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border ${
                activeTab !== 'ALL' && activeTab !== 'ALERTAS'
                  ? 'font-bold'
                  : 'border-transparent text-[#8b9eb0] hover:text-white hover:bg-[#111e2e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 flex-shrink-0" />
                <span>Ordens em Aberto</span>
              </div>
              <span
                style={{ backgroundColor: `${brandColor}25`, color: brandColor }}
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              >
                {countOpen}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTAS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ALERTAS'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                  : 'text-[#8b9eb0] hover:text-white hover:bg-[#111e2e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Alertas 6 Meses</span>
              </div>
              {alertasRetorno.length > 0 && (
                <span className="text-[11px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full">
                  {alertasRetorno.length}
                </span>
              )}
            </button>

            {isAdminSession && (
              <Link
                href="/admin"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-all"
              >
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Painel Admin Master</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Perfil da Oficina no Rodapé da Sidebar */}
        <div className="pt-4 border-t border-[#1c2e42] space-y-3">
          <div className="bg-[#0e1724] border border-[#1c2e42] p-3 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-white truncate">
                {currentOficina.nome}
              </div>
              <div style={{ color: brandColor }} className="text-[10px] font-mono mt-0.5">
                ● Pátio Online
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. CONTEÚDO PRINCIPAL (DESKTOP + MOBILE)
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 lg:pb-0">
        
        {/* Top Header Barra de Busca e Usuário */}
        <header className="sticky top-0 z-30 bg-[#080d14]/90 backdrop-blur-md border-b border-[#1c2e42] px-4 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Mobile: Logo da Oficina e Ações */}
            <div className="flex lg:hidden items-center justify-between w-full">
              <PitTrackLogo
                size="sm"
                logoUrl={currentOficina.logo_url}
                corPrimaria={brandColor}
                nomeOficina={currentOficina.nome}
              />
              <div className="flex items-center gap-1.5">
                {isAdminSession && (
                  <Link
                    href="/admin"
                    title="Voltar ao Painel Master Admin"
                    className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop: Barra de Busca */}
            <div className="hidden lg:flex items-center flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, veículo, placa ou nº da OS..."
                  className="w-full bg-[#0d1622] border border-[#1c2e42] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Desktop: Perfil do Gerente */}
            <div className="hidden lg:flex items-center gap-3">
              {isAdminSession && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Painel Master</span>
                </Link>
              )}

              <button 
                title="Notificações"
                className="relative p-2 rounded-xl text-[#8b9eb0] hover:text-white hover:bg-[#111e2e] transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span
                  style={{ backgroundColor: brandColor }}
                  className="w-2 h-2 rounded-full absolute top-2 right-2 ring-2 ring-[#080d14]"
                />
              </button>

              <div className="flex items-center gap-3 pl-2 border-l border-[#1c2e42]">
                <div
                  style={{
                    backgroundColor: `${brandColor}25`,
                    color: brandColor,
                    borderColor: `${brandColor}45`,
                  }}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs font-mono shadow-sm overflow-hidden"
                >
                  {currentOficina.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentOficina.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    currentOficina.nome.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{currentOficina.nome.split('-')[0].trim()}</span>
                  </div>
                  <div className="text-[10px] text-[#8b9eb0]">Gerente de Oficina</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="mt-3 lg:hidden">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, placa ou OS..."
                className="w-full bg-[#0d1622] border border-[#1c2e42] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </header>

        {/* Layout de Duas Colunas no Desktop: Centro (Ordens) + Direita (Today's Overview) */}
        <div className="flex-1 flex flex-col xl:flex-row p-4 lg:p-8 gap-6">
          
          {/* =========================================================================
              ÁREA CENTRAL: LISTA DE ORDENS DE SERVIÇO
          ========================================================================= */}
          <main className="flex-1 min-w-0 space-y-5">
            
            {/* Header da Página: Título + Botão Nova OS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                  {activeTab === 'ALERTAS' ? 'Alertas de Retorno Preventivo' : 'Ordens de Serviço'}
                </h1>
                <p className="text-xs text-[#8b9eb0] mt-0.5">
                  {activeTab === 'ALERTAS'
                    ? 'Veículos com revisão ou troca de óleo vencendo em 15 dias'
                    : 'Gerencie ordens, adicione itens extras e reenvie para aprovação no WhatsApp'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/nova-os"
                  style={{ backgroundColor: brandColor }}
                  className="inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Nova Ordem de Serviço</span>
                </Link>
              </div>
            </div>

            {/* Abas de Filtros (Pills com a cor padrão da oficina) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: 'ALL', label: 'Todas', count: countAll },
                  { id: 'ORCAMENTO', label: 'Orçamentos', count: countOpen },
                  { id: 'APROVADO', label: 'Aprovadas', count: countPartsOrdered },
                  { id: 'EM_SERVICO', label: 'Em Serviço', count: countInProgress },
                  { id: 'FINALIZADO', label: 'Finalizadas', count: countCompleted },
                ] as const
              ).map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={isSelected ? { backgroundColor: brandColor } : undefined}
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      isSelected
                        ? 'text-slate-950 shadow-md'
                        : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Exibição em Tabela (Desktop) */}
            <div className="hidden lg:block bg-[#0e1724] border border-[#1c2e42] rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1c2e42] bg-[#0b121b] text-[#5c7287] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Nº OS</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Veículo</th>
                    <th className="py-3.5 px-4">Placa / KM</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Itens / Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182738]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8b9eb0]">
                        Carregando ordens de serviço...
                      </td>
                    </tr>
                  ) : filteredOrdens.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8b9eb0]">
                        Nenhuma ordem de serviço localizada nesta categoria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrdens.map((os) => {
                      const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/os/${os.id}` : '';
                      const whatsAppLink =
                        os.status === 'FINALIZADO'
                          ? generateWhatsAppVeiculoProntoLink(os, currentOficina.nome, publicUrl)
                          : generateWhatsAppLinkParaCliente(
                              {
                                cliente_nome: os.cliente_nome,
                                cliente_whatsapp: os.cliente_whatsapp,
                                veiculo_modelo: os.veiculo_modelo,
                                veiculo_placa: os.veiculo_placa,
                                codigo_curto: os.codigo_curto,
                                id: os.id,
                              },
                              currentOficina.nome,
                              publicUrl
                            );

                      return (
                        <tr
                          key={os.id}
                          className="hover:bg-[#121f2f] transition-colors group text-[#cbd5e1]"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            #{os.codigo_curto}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {os.cliente_nome}
                          </td>
                          <td className="py-3.5 px-4 text-[#8b9eb0]">
                            {os.veiculo_modelo}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <span className="text-white font-bold">{os.veiculo_placa}</span>
                            <span className="text-[#5c7287] ml-1.5 font-normal">
                              ({os.km_atual ? `${os.km_atual.toLocaleString('pt-BR')} km` : 'N/A'})
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {renderStatusBadge(os)}
                          </td>
                          <td
                            style={{ color: brandColor }}
                            className="py-3.5 px-4 text-right font-mono font-bold"
                          >
                            R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {os.status === 'FINALIZADO' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCopiedProntoLink(false);
                                    setProntoOS(os);
                                  }}
                                  style={{ backgroundColor: `${brandColor}20`, color: brandColor, borderColor: `${brandColor}45` }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:opacity-90 transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Link Pronto</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItensModal(os)}
                                  title="Adicionar peças ou serviços técnicos e reenviar para aprovação"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#122030] hover:bg-[#192c42] border border-[#1e344d] text-[11px] font-bold text-white transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" style={{ color: brandColor }} />
                                  <span>{os.status === 'APROVADO' ? 'Adicionar e Reenviar' : 'Itens'}</span>
                                </button>
                              )}
                              <Link
                                href={`/os/${os.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Visualizar Link do Cliente"
                                className="p-1.5 rounded-lg text-[#8b9eb0] hover:text-white hover:bg-[#1c2e42] transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <a
                                href={whatsAppLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={
                                  os.status === 'FINALIZADO'
                                    ? 'Avisar Cliente no WhatsApp que o Veículo está Pronto'
                                    : 'Enviar Orçamento pelo WhatsApp'
                                }
                                style={{ color: brandColor }}
                                className="p-1.5 rounded-lg hover:bg-[#1c2e42] transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Exibição em Cards Mobile */}
            <div className="lg:hidden space-y-4">
              {isLoading ? (
                <div className="py-12 text-center text-[#8b9eb0]">
                  Carregando ordens...
                </div>
              ) : filteredOrdens.length === 0 ? (
                <div className="py-12 text-center text-[#8b9eb0]">
                  Nenhuma ordem encontrada.
                </div>
              ) : (
                filteredOrdens.map((os) => {
                  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/os/${os.id}` : '';
                  const whatsAppLink =
                    os.status === 'FINALIZADO'
                      ? generateWhatsAppVeiculoProntoLink(os, currentOficina.nome, publicUrl)
                      : generateWhatsAppLinkParaCliente(
                          {
                            cliente_nome: os.cliente_nome,
                            cliente_whatsapp: os.cliente_whatsapp,
                            veiculo_modelo: os.veiculo_modelo,
                            veiculo_placa: os.veiculo_placa,
                            codigo_curto: os.codigo_curto,
                            id: os.id,
                          },
                          currentOficina.nome,
                          publicUrl
                        );

                  return (
                    <div
                      key={os.id}
                      className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-lg space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-[#182738] pb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-white tracking-tight">
                            Ordem de Serviço #{os.codigo_curto}
                          </span>
                        </div>
                        {renderStatusBadge(os)}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#8b9eb0]">
                        <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: brandColor }} />
                        <span className="font-semibold text-white truncate">
                          {os.cliente_nome}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[#8b9eb0] min-w-0">
                          <Car className="w-3.5 h-3.5 flex-shrink-0" style={{ color: brandColor }} />
                          <span className="text-white truncate font-medium">
                            {os.veiculo_modelo}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs bg-[#0b121b] border border-[#1c2e42] px-2 py-0.5 rounded text-white flex-shrink-0">
                          {os.veiculo_placa}
                        </span>
                      </div>

                      <div className="bg-[#091018] rounded-xl p-3 border border-[#182738] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#8b9eb0] uppercase tracking-wider">
                          Valor Total
                        </span>
                        <span
                          style={{ color: brandColor }}
                          className="text-base font-black font-mono"
                        >
                          R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Botão para Adicionar Itens ou Gerar Link de Veículo Pronto */}
                      {os.status === 'FINALIZADO' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCopiedProntoLink(false);
                            setProntoOS(os);
                          }}
                          style={{ backgroundColor: `${brandColor}18`, color: brandColor, borderColor: `${brandColor}45` }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl border transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gerar Link de Veículo Pronto p/ Cliente</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditItensModal(os)}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#122030] hover:bg-[#16293d] text-white text-xs font-bold py-2.5 px-3 rounded-xl border border-[#1e344d] transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" style={{ color: brandColor }} />
                          <span>
                            {os.status === 'APROVADO'
                              ? 'Adicionar Itens Extras e Reenviar p/ Aprovação'
                              : 'Editar / Adicionar Peças e Serviços Técnicos'}
                          </span>
                        </button>
                      )}

                      {/* Ações Mobile */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/os/${os.id}`}
                          className="flex items-center justify-center gap-1.5 bg-[#0b121b] hover:bg-[#16293d] text-white text-xs font-bold py-2.5 px-3 rounded-xl border border-[#1c2e42] transition-all text-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" style={{ color: brandColor }} />
                          <span>Link do Cliente</span>
                        </Link>

                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ backgroundColor: brandColor }}
                          className="flex items-center justify-center gap-1.5 hover:opacity-90 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-xl shadow-md transition-all text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>{os.status === 'FINALIZADO' ? 'Avisar Pronto' : 'WhatsApp'}</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Seção de Alertas Preventivos (quando aba Alertas está selecionada) */}
            {activeTab === 'ALERTAS' && (
              <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1c2e42] pb-3">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Revisões Preventivas & Trocas de Óleo Vencidas / a Vencer</span>
                  </span>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {alertasRetorno.length} identificadas
                  </span>
                </div>

                {alertasRetorno.length === 0 ? (
                  <p className="text-xs text-[#8b9eb0] py-4 text-center">
                    Todas as revisões preventivas de 6 meses estão em dia!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {alertasRetorno.map((os) => {
                      const revisaoLink = generateWhatsAppRevisaoLink(os, currentOficina.nome);
                      return (
                        <div
                          key={os.id}
                          className="bg-[#0a121b] border border-[#1c2e42] rounded-xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {os.cliente_nome}
                            </div>
                            <div className="text-[11px] text-[#8b9eb0] truncate">
                              {os.veiculo_modelo} • {os.veiculo_placa}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 ${
                                os.isVencido
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {os.isVencido ? `Venceu há ${Math.abs(os.diffDays)} dias` : `Vence em ${os.diffDays} dias`}
                            </span>
                          </div>

                          <a
                            href={revisaoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ backgroundColor: brandColor }}
                            className="hover:opacity-90 text-slate-950 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md flex-shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>Avisar</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* =========================================================================
              3. PAINEL LATERAL DIREITO (DESKTOP): RESUMO DO DIA & TOTAIS FINANCEIROS
          ========================================================================= */}
          <aside className="hidden xl:flex w-80 flex-col gap-5 flex-shrink-0">
            
            {/* Card 1: Resumo do Dia */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c2e42] pb-3">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Resumo do Dia
                </h3>
                <span className="text-[11px] text-[#5c7287] font-mono">
                  {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="space-y-3">
                <div className="bg-[#091018] border border-[#182738] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: `${brandColor}18`, color: brandColor }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-[#8b9eb0] font-medium">Total de Ordens</span>
                  </div>
                  <span className="text-base font-black text-white font-mono">{countAll}</span>
                </div>

                <div className="bg-[#091018] border border-[#182738] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-[#8b9eb0] font-medium">Em Serviço</span>
                  </div>
                  <span className="text-base font-black text-sky-400 font-mono">{countInProgress}</span>
                </div>

                <div className="bg-[#091018] border border-[#182738] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: `${brandColor}18`, color: brandColor }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-[#8b9eb0] font-medium">Em Orçamento</span>
                  </div>
                  <span style={{ color: brandColor }} className="text-base font-black font-mono">
                    {countOpen}
                  </span>
                </div>

                <div className="bg-[#091018] border border-[#182738] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-[#8b9eb0] font-medium">Finalizadas</span>
                  </div>
                  <span className="text-base font-black text-slate-300 font-mono">{countCompleted}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Totais Financeiros (Serviço Técnico vs. Peças) */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white tracking-tight border-b border-[#1c2e42] pb-3">
                Totais Financeiros
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8b9eb0]">
                  <span>Serviço Técnico</span>
                  <span className="font-mono font-bold text-white">
                    R$ {totalServicoTecnicoEst.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8b9eb0]">
                  <span>Peças & Componentes</span>
                  <span className="font-mono font-bold text-white">
                    R$ {totalPecasEst.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8b9eb0]">
                  <span>Insumos & Outros</span>
                  <span className="font-mono font-bold text-white">
                    R$ {totalOutrosEst.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#1c2e42] flex items-baseline justify-between">
                  <span className="text-xs uppercase font-extrabold text-[#8b9eb0] tracking-wider">
                    Total
                  </span>
                  <span style={{ color: brandColor }} className="text-2xl font-black font-mono">
                    R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Ordens Nesta Semana */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Ordens Nesta Semana
                </h3>
                <span
                  style={{
                    color: brandColor,
                    backgroundColor: `${brandColor}18`,
                    borderColor: `${brandColor}35`,
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                >
                  +18%
                </span>
              </div>

              <div className="pt-2">
                <svg viewBox="0 0 240 60" className="w-full h-16 fill-none">
                  <path
                    d="M 0 45 Q 40 20, 80 35 T 160 15 T 240 30"
                    stroke="#1c2e42"
                    strokeWidth="2"
                  />
                  <path
                    d="M 0 50 Q 40 10, 80 40 T 160 20 T 240 10"
                    stroke={brandColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="40" cy="22" r="3" fill={brandColor} />
                  <circle cx="120" cy="30" r="3" fill={brandColor} />
                  <circle cx="200" cy="15" r="3" fill={brandColor} />
                </svg>

                <div className="flex items-center justify-between text-[10px] text-[#5c7287] font-mono mt-2 pt-1 border-t border-[#182738]">
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                  <span>Dom</span>
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: ADICIONAR ITENS E REENVIAR PARA APROVAÇÃO (PÓS-APROVAÇÃO)
      ========================================================================= */}
      {editingOS && (
        <div className="fixed inset-0 z-50 bg-[#080d14]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#182738] pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  Editar / Adicionar Itens — #{editingOS.codigo_curto}
                </h3>
                <p className="text-[11px] text-[#8b9eb0]">
                  {editingOS.veiculo_modelo} ({editingOS.veiculo_placa}) • Cliente: {editingOS.cliente_nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOS(null)}
                className="p-1.5 rounded-xl bg-[#080d14] text-slate-400 hover:text-white border border-[#1c2e42] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingOS.status === 'APROVADO' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  Este orçamento já estava <strong>Aprovado</strong>. Ao salvar novos itens, ele voltará para <strong>Em Orçamento</strong> para nova aprovação do cliente.
                </span>
              </div>
            )}

            {/* Atalhos rápidos de itens adicionais do catálogo da oficina */}
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8b9eb0] block mb-1.5">
                Catálogo Rápido da Oficina (1 Clique):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {catalogoAdicionais.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setEditingItens((prev) => [
                        ...prev,
                        { tipo: sug.tipo, descricao: sug.descricao, valor: sug.valor },
                      ])
                    }
                    className="text-[10px] bg-[#080d14] border border-[#1c2e42] hover:border-slate-500 text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" style={{ color: brandColor }} />
                    <span>{sug.descricao}</span>
                    <span style={{ color: brandColor }} className="font-mono font-bold">
                      R${sug.valor}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Novo Item Manual */}
            <div className="bg-[#080d14] border border-[#1c2e42] p-3 rounded-2xl space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 bg-[#0e1724] p-1 rounded-xl border border-[#1c2e42]">
                <button
                  type="button"
                  onClick={() => setNovoItemTipo('PECA')}
                  style={novoItemTipo === 'PECA' ? { backgroundColor: brandColor } : undefined}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoItemTipo === 'PECA' ? 'text-slate-950' : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Peça</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNovoItemTipo('MAO_DE_OBRA')}
                  style={novoItemTipo === 'MAO_DE_OBRA' ? { backgroundColor: brandColor } : undefined}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoItemTipo === 'MAO_DE_OBRA' ? 'text-slate-950' : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Serviço Técnico</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Descrição da peça ou serviço técnico..."
                  value={novoItemDesc}
                  onChange={(e) => setNovoItemDesc(e.target.value)}
                  className="col-span-2 bg-[#0e1724] border border-[#1c2e42] text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="R$ Valor"
                  value={novoItemValor}
                  onChange={(e) => setNovoItemValor(e.target.value)}
                  className="bg-[#0e1724] border border-[#1c2e42] text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddNovoItemModal}
                className="w-full bg-[#122030] hover:bg-[#192b40] text-white font-bold text-xs py-2 rounded-xl border border-[#1e344d] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" style={{ color: brandColor }} />
                <span>Incluir Item na Ordem de Serviço</span>
              </button>
            </div>

            {/* Lista de Itens Atuais da OS */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {isLoadingItens ? (
                <div className="py-6 text-center text-xs text-[#8b9eb0]">
                  Carregando itens da OS...
                </div>
              ) : editingItens.length === 0 ? (
                <div className="py-6 text-center text-xs text-rose-400">
                  Adicione pelo menos 1 item na Ordem de Serviço.
                </div>
              ) : (
                editingItens.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-[#080d14] border border-[#1c2e42] p-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        style={{
                          backgroundColor: `${brandColor}18`,
                          color: brandColor,
                          borderColor: `${brandColor}35`,
                        }}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
                      >
                        {it.tipo === 'PECA' ? 'Peça' : 'Serviço Técnico'}
                      </span>
                      <span className="text-slate-200 truncate">{it.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                      <span className="font-bold text-white">
                        R$ {Number(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemModal(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Novo Total Calculado */}
            <div className="bg-[#091018] rounded-xl p-3 border border-[#1c2e42] flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-[#8b9eb0]">
                Novo Valor Total Atualizado
              </span>
              <span style={{ color: brandColor }} className="text-xl font-black font-mono">
                R$ {totalModalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSavingItens || editingItens.length === 0}
                onClick={() => handleSalvarEReenviarOS(true)}
                style={{ backgroundColor: brandColor }}
                className="w-full flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg cursor-pointer"
              >
                {isSavingItens ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 fill-current" />
                )}
                <span>Salvar Adicionais e Reenviar p/ Aprovação no WhatsApp</span>
              </button>

              <button
                type="button"
                disabled={isSavingItens || editingItens.length === 0}
                onClick={() => handleSalvarEReenviarOS(false)}
                className="w-full bg-[#122030] hover:bg-[#192b40] text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-[#1e344d] cursor-pointer"
              >
                Apenas Salvar Alterações (Reabrir p/ Aprovação)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: VEÍCULO PRONTO PARA RETIRADA (GERAR LINK & ENVIAR WHATSAPP)
      ========================================================================= */}
      {prontoOS && (
        <div className="fixed inset-0 z-50 bg-[#080d14]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#182738] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Veículo Pronto para Retirada!
                  </h3>
                  <p className="text-xs text-[#8b9eb0]">
                    OS #{prontoOS.codigo_curto} • {prontoOS.veiculo_modelo} ({prontoOS.veiculo_placa})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProntoOS(null)}
                className="p-1.5 rounded-xl bg-[#080d14] text-slate-400 hover:text-white border border-[#1c2e42] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#080d14] border border-[#1c2e42] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8b9eb0]">Cliente:</span>
                <span className="font-bold text-white">{prontoOS.cliente_nome}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8b9eb0]">Valor Total Concluído:</span>
                <span style={{ color: brandColor }} className="font-mono font-black text-sm">
                  R$ {Number(prontoOS.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Link gerado para o cliente */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8b9eb0] block">
                Link do Resumo e Garantia para o Cliente:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/os/${prontoOS.id}` : `/os/${prontoOS.id}`}
                  className="flex-1 bg-[#080d14] border border-[#1c2e42] rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/os/${prontoOS.id}`;
                    navigator.clipboard.writeText(url);
                    setCopiedProntoLink(true);
                    setTimeout(() => setCopiedProntoLink(false), 3000);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-[#132030] hover:bg-[#1a2c42] border border-[#223854] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedProntoLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" style={{ color: brandColor }} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Botão Principal: Enviar no WhatsApp do Cliente */}
            <div className="space-y-2 pt-1">
              <a
                href={generateWhatsAppVeiculoProntoLink(
                  prontoOS,
                  currentOficina.nome,
                  typeof window !== 'undefined' ? `${window.location.origin}/os/${prontoOS.id}` : ''
                )}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: brandColor }}
                className="w-full flex items-center justify-center gap-2 hover:opacity-90 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Enviar Aviso de Veículo Pronto no WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setProntoOS(null)}
                className="w-full bg-[#122030] hover:bg-[#192b40] text-slate-300 font-bold text-xs py-2.5 rounded-xl border border-[#1e344d] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MOBILE BOTTOM NAVIGATION
      ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d14]/95 backdrop-blur-xl border-t border-[#1c2e42] px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('ALL')}
          style={activeTab === 'ALL' ? { color: brandColor } : undefined}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ALL' ? '' : 'text-[#8b9eb0] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveTab('ORCAMENTO')}
          style={activeTab === 'ORCAMENTO' ? { color: brandColor } : undefined}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ORCAMENTO' ? '' : 'text-[#8b9eb0] hover:text-white'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>Ordens</span>
        </button>

        <Link
          href="/nova-os"
          className="flex flex-col items-center gap-1 -mt-4 text-[10px] font-black text-slate-950"
        >
          <div
            style={{ backgroundColor: brandColor }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-slate-950 shadow-lg"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span style={{ color: brandColor }} className="font-bold">
            Nova OS
          </span>
        </Link>

        <button
          onClick={() => setActiveTab('ALERTAS')}
          style={activeTab === 'ALERTAS' ? { color: brandColor } : undefined}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ALERTAS' ? '' : 'text-[#8b9eb0] hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Alertas</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#8b9eb0] hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </nav>

    </div>
  );
}
