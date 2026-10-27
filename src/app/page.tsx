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
  ChevronDown
} from 'lucide-react';
import { OrdemServico, StatusOS } from '@/types/database';
import { 
  fetchOrdensServico, 
  subscribeToOrdensServico, 
  generateWhatsAppLinkParaCliente, 
  generateWhatsAppRevisaoLink,
  updateOrdemServicoStatus
} from '@/lib/osService';
import { 
  useCurrentOficina, 
  useIsHydrated, 
  logoutOficina 
} from '@/lib/authService';
import PitTrackLogo from '@/components/PitTrackLogo';

type FilterTab = 'ALL' | 'ORCAMENTO' | 'EM_SERVICO' | 'APROVADO' | 'FINALIZADO' | 'ALERTAS';

export default function DashboardPage() {
  const router = useRouter();
  const currentOficina = useCurrentOficina();
  const isHydrated = useIsHydrated();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  // 1. Redirecionar para login caso não autenticado após hidratação
  useEffect(() => {
    if (isHydrated && !currentOficina) {
      router.replace('/login');
    }
  }, [isHydrated, currentOficina, router]);

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
        setRealtimeNotification(`⚡ A OS ${updatedOS.codigo_curto || ''} foi APROVADA pelo cliente!`);
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
      // Filtro de texto
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        !q ||
        os.veiculo_placa.toLowerCase().includes(q) ||
        os.veiculo_modelo.toLowerCase().includes(q) ||
        os.cliente_nome.toLowerCase().includes(q) ||
        os.codigo_curto.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filtro por Tab
      if (activeTab === 'ALL') return true;
      if (activeTab === 'ORCAMENTO') return os.status === 'ORCAMENTO';
      if (activeTab === 'EM_SERVICO') return os.status === 'EM_SERVICO';
      if (activeTab === 'APROVADO') return os.status === 'APROVADO';
      if (activeTab === 'FINALIZADO') return os.status === 'FINALIZADO';
      return true;
    });
  }, [ordens, searchQuery, activeTab]);

  // Cálculos de Totais (Budget Totals)
  const totalGeral = ordens.reduce((s, o) => s + (Number(o.valor_total) || 0), 0);
  const totalMaoDeObraEst = totalGeral * 0.45;
  const totalPecasEst = totalGeral * 0.50;
  const totalOutrosEst = totalGeral * 0.05;

  // Transição rápida de status no pátio com feedback imediato
  const handleUpdateStatus = async (id: string, codigo: string, newStatus: StatusOS) => {
    const ok = await updateOrdemServicoStatus(id, newStatus);
    if (ok) {
      setRealtimeNotification(`⚡ Status da OS ${codigo} alterado para "${newStatus}"!`);
      setTimeout(() => setRealtimeNotification(null), 4000);
    }
  };

  // Seletor Interativo de Status com Transição Rápida
  const renderStatusBadge = (os: OrdemServico) => {
    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <select
          value={os.status}
          onChange={(e) => handleUpdateStatus(os.id, os.codigo_curto, e.target.value as StatusOS)}
          className={`appearance-none cursor-pointer text-xs font-bold px-2.5 py-1 pr-6 rounded-full border transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
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

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex selection:bg-emerald-500 selection:text-[#080d14]">
      
      {/* Toast Notificação Realtime */}
      {realtimeNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300 border border-emerald-400">
          <Sparkles className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <span className="text-xs">{realtimeNotification}</span>
        </div>
      )}

      {/* =========================================================================
          1. DESKTOP SIDEBAR (Esquerda - Fiel ao Mockup do MacBook)
      ========================================================================= */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0b121b] border-r border-[#1c2e42] flex-shrink-0 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo da Marca */}
          <Link href="/" className="block">
            <PitTrackLogo size="md" />
          </Link>

          {/* Menu de Navegação */}
          <nav className="space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                  : 'text-[#8b9eb0] hover:text-white hover:bg-[#111e2e]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Painel Principal</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab !== 'ALERTAS'
                  ? 'bg-[#122030] text-emerald-400 font-bold border border-[#1e344d]'
                  : 'text-[#8b9eb0] hover:text-white hover:bg-[#111e2e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 flex-shrink-0" />
                <span>Ordens de Serviço</span>
              </div>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                {countAll}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTAS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ALERTAS'
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
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
          </nav>
        </div>

        {/* Perfil da Oficina no Rodapé da Sidebar */}
        <div className="pt-4 border-t border-[#1c2e42] space-y-3">
          <div className="bg-[#0e1724] border border-[#1c2e42] p-3 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-white truncate">
                {currentOficina.nome}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Barra de Busca e Usuário */}
        <header className="sticky top-0 z-30 bg-[#080d14]/90 backdrop-blur-md border-b border-[#1c2e42] px-4 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Mobile: Logo e Ações */}
            <div className="flex lg:hidden items-center justify-between w-full">
              <PitTrackLogo size="sm" />
              <div className="flex items-center gap-2">
                <Link
                  href="/nova-os"
                  className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Nova OS</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop: Barra de Busca Estilo PitTrack */}
            <div className="hidden lg:flex items-center flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, veículo, placa ou nº da OS..."
                  className="w-full bg-[#0d1622] border border-[#1c2e42] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Desktop: Notificações & Perfil do Gerente */}
            <div className="hidden lg:flex items-center gap-4">
              <button 
                title="Notificações"
                className="relative p-2 rounded-xl text-[#8b9eb0] hover:text-white hover:bg-[#111e2e] transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 ring-2 ring-[#080d14]" />
              </button>

              <div className="flex items-center gap-3 pl-2 border-l border-[#1c2e42]">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs font-mono shadow-sm">
                  {currentOficina.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{currentOficina.nome.split('-')[0].trim()}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#5c7287]" />
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
                    : 'Gerencie e acompanhe todas as ordens de serviço do pátio'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/nova-os"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Nova Ordem de Serviço</span>
                </Link>
              </div>
            </div>

            {/* Abas de Filtros (Pills fieis ao Mockup) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                }`}
              >
                <span>Todas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'ALL' ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                  {countAll}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('ORCAMENTO')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  activeTab === 'ORCAMENTO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                }`}
              >
                <span>Orçamentos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'ORCAMENTO' ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                  {countOpen}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('EM_SERVICO')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  activeTab === 'EM_SERVICO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                }`}
              >
                <span>Em Serviço</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'EM_SERVICO' ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                  {countInProgress}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('APROVADO')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  activeTab === 'APROVADO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                }`}
              >
                <span>Aprovadas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'APROVADO' ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                  {countPartsOrdered}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('FINALIZADO')}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  activeTab === 'FINALIZADO'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1724] text-[#8b9eb0] hover:text-white border border-[#1c2e42]'
                }`}
              >
                <span>Finalizadas</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'FINALIZADO' ? 'bg-slate-950/20' : 'bg-[#182635]'}`}>
                  {countCompleted}
                </span>
              </button>
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
                    <th className="py-3.5 px-4">Entrada</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182738]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#8b9eb0]">
                        Carregando ordens de serviço...
                      </td>
                    </tr>
                  ) : filteredOrdens.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#8b9eb0]">
                        Nenhuma ordem de serviço localizada nesta categoria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrdens.map((os) => {
                      const whatsAppLink = generateWhatsAppLinkParaCliente(
                        {
                          cliente_nome: os.cliente_nome,
                          cliente_whatsapp: os.cliente_whatsapp,
                          veiculo_modelo: os.veiculo_modelo,
                          veiculo_placa: os.veiculo_placa,
                          codigo_curto: os.codigo_curto,
                          id: os.id,
                        },
                        currentOficina.nome,
                        typeof window !== 'undefined' ? `${window.location.origin}/os/${os.id}` : ''
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
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-[#5c7287] font-mono text-[11px]">
                            {new Date(os.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
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
                                title="Enviar pelo WhatsApp"
                                className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
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

            {/* Exibição em Cards Mobile (Fiel ao Mockup do iPhone à Esquerda) */}
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
                  const whatsAppLink = generateWhatsAppLinkParaCliente(
                    {
                      cliente_nome: os.cliente_nome,
                      cliente_whatsapp: os.cliente_whatsapp,
                      veiculo_modelo: os.veiculo_modelo,
                      veiculo_placa: os.veiculo_placa,
                      codigo_curto: os.codigo_curto,
                      id: os.id,
                    },
                    currentOficina.nome,
                    typeof window !== 'undefined' ? `${window.location.origin}/os/${os.id}` : ''
                  );

                  return (
                    <div
                      key={os.id}
                      className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-lg space-y-3.5"
                    >
                      {/* Topo do Card: Work Order # + Status Pill */}
                      <div className="flex items-center justify-between border-b border-[#182738] pb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-white tracking-tight">
                            Ordem de Serviço #{os.codigo_curto}
                          </span>
                        </div>
                        {renderStatusBadge(os)}
                      </div>

                      {/* Cliente */}
                      <div className="flex items-center gap-2 text-xs text-[#8b9eb0]">
                        <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="font-semibold text-white truncate">
                          {os.cliente_nome}
                        </span>
                      </div>

                      {/* Veículo & Placa */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[#8b9eb0] min-w-0">
                          <Car className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-white truncate font-medium">
                            {os.veiculo_modelo}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs bg-[#0b121b] border border-[#1c2e42] px-2 py-0.5 rounded text-white flex-shrink-0">
                          {os.veiculo_placa}
                        </span>
                      </div>

                      {/* Resumo de Valor Total Estilo Mockup Mobile */}
                      <div className="bg-[#091018] rounded-xl p-3 border border-[#182738] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#8b9eb0] uppercase tracking-wider">
                          Valor Total
                        </span>
                        <span className="text-base font-black text-emerald-400 font-mono">
                          R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Ações Mobile */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href={`/os/${os.id}`}
                          className="flex items-center justify-center gap-1.5 bg-[#122030] hover:bg-[#16293d] text-white text-xs font-bold py-2.5 px-3 rounded-xl border border-[#1e344d] transition-all text-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Link do Cliente</span>
                        </Link>

                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-xl shadow-md shadow-emerald-500/20 transition-all text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp</span>
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
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 flex-shrink-0"
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
              3. PAINEL LATERAL DIREITO (DESKTOP): TODAY'S OVERVIEW & BUDGET TOTALS
              (Fiel ao Mockup do MacBook na Imagem)
          ========================================================================= */}
          <aside className="hidden xl:flex w-80 flex-col gap-5 flex-shrink-0">
            
            {/* Card 1: Today's Overview */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c2e42] pb-3">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Resumo do Dia
                </h3>
                <span className="text-[11px] text-[#5c7287] font-mono">
                  {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Métricas Rápidas com Ícones Verdes */}
              <div className="space-y-3">
                <div className="bg-[#091018] border border-[#182738] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
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
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-[#8b9eb0] font-medium">Em Orçamento</span>
                  </div>
                  <span className="text-base font-black text-emerald-400 font-mono">{countOpen}</span>
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

            {/* Card 2: Budget Totals */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white tracking-tight border-b border-[#1c2e42] pb-3">
                Totais Financeiros
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8b9eb0]">
                  <span>Mão de Obra</span>
                  <span className="font-mono font-bold text-white">
                    R$ {totalMaoDeObraEst.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Work Orders This Week (Mini Gráfico SVG) */}
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Ordens Nesta Semana
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +18%
                </span>
              </div>

              {/* Gráfico SVG estilo Sparkline da Imagem */}
              <div className="pt-2">
                <svg viewBox="0 0 240 60" className="w-full h-16 stroke-emerald-400 fill-none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Curva de fundo */}
                  <path
                    d="M 0 45 Q 40 20, 80 35 T 160 15 T 240 30"
                    stroke="#1c2e42"
                    strokeWidth="2"
                  />
                  {/* Curva ativa verde neon */}
                  <path
                    d="M 0 50 Q 40 10, 80 40 T 160 20 T 240 10"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Pontos nos picos */}
                  <circle cx="40" cy="22" r="3" fill="#22c55e" />
                  <circle cx="120" cy="30" r="3" fill="#22c55e" />
                  <circle cx="200" cy="15" r="3" fill="#22c55e" />
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
          4. MOBILE BOTTOM NAVIGATION (Fiel ao Mockup do iPhone)
      ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d14]/95 backdrop-blur-xl border-t border-[#1c2e42] px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ALL' ? 'text-emerald-400' : 'text-[#8b9eb0] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveTab('ORCAMENTO')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ORCAMENTO' ? 'text-emerald-400' : 'text-[#8b9eb0] hover:text-white'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>Ordens</span>
        </button>

        <Link
          href="/nova-os"
          className="flex flex-col items-center gap-1 -mt-4 text-[10px] font-black text-slate-950"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/40">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-emerald-400 font-bold">Nova OS</span>
        </Link>

        <button
          onClick={() => setActiveTab('ALERTAS')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
            activeTab === 'ALERTAS' ? 'text-emerald-400' : 'text-[#8b9eb0] hover:text-white'
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
