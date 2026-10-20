'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  Car, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ExternalLink, 
  MessageCircle, 
  Radio, 
  Calendar, 
  Search, 
  ChevronDown,
  Gauge,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Oficina, OrdemServico, StatusOS } from '@/types/database';
import { 
  fetchOficinas, 
  fetchOrdensServico, 
  subscribeToOrdensServico, 
  generateWhatsAppLinkParaCliente, 
  generateWhatsAppRevisaoLink,
  aprovarOrçamento
} from '@/lib/osService';

export default function DashboardPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [selectedOficinaId, setSelectedOficinaId] = useState<string>('');
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [activeTab, setActiveTab] = useState<'patio' | 'alertas'>('patio');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  // Carregar oficinas iniciais e marcar como montado
  useEffect(() => {
    setMounted(true);
    async function initData() {
      setIsLoading(true);
      const ofs = await fetchOficinas();
      setOficinas(ofs);
      if (ofs.length > 0) {
        setSelectedOficinaId(ofs[0].id);
      }
      setIsLoading(false);
    }
    initData();
  }, []);

  // Carregar ordens da oficina selecionada
  useEffect(() => {
    if (!selectedOficinaId) return;

    let isMounted = true;
    async function loadOrdens() {
      const data = await fetchOrdensServico(selectedOficinaId);
      if (isMounted) {
        setOrdens(data);
      }
    }
    loadOrdens();

    // Inscrever no Realtime (Supabase + broadcast local)
    const unsubscribe = subscribeToOrdensServico((updatedOS) => {
      // Notificação visual no topo
      if (updatedOS.status === 'APROVADO') {
        setRealtimeNotification(`⚡ A OS ${updatedOS.codigo_curto || ''} foi APROVADA pelo cliente!`);
        setTimeout(() => setRealtimeNotification(null), 6000);
      }

      setOrdens((prev) => {
        const exists = prev.some((o) => o.id === updatedOS.id);
        if (exists) {
          return prev.map((o) => (o.id === updatedOS.id ? { ...o, ...updatedOS } as OrdemServico : o));
        } else if (updatedOS.oficina_id === selectedOficinaId) {
          return [updatedOS as OrdemServico, ...prev];
        }
        return prev;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedOficinaId]);

  const currentOficina = useMemo(() => {
    return oficinas.find((o) => o.id === selectedOficinaId) || oficinas[0];
  }, [oficinas, selectedOficinaId]);

  // Filtragem de Pátio
  const patioOrdens = useMemo(() => {
    return ordens.filter((os) => {
      // Exibir ordens ativas (Orçamento, Aprovado, Em Serviço)
      const matchesSearch = 
        os.veiculo_placa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        os.veiculo_modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        os.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        os.codigo_curto.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [ordens, searchQuery]);

  // Alertas de Retorno (6 meses / vencidos ou a vencer em 15 dias)
  const alertasRetorno = useMemo(() => {
    if (!mounted) return [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return ordens.filter((os) => {
      if (!os.data_proximo_retorno) return false;
      const dataRet = new Date(os.data_proximo_retorno);
      dataRet.setHours(0, 0, 0, 0);

      const diffTime = dataRet.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Se já venceu (diffDays <= 0) ou se vence nos próximos 15 dias (diffDays <= 15)
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
  }, [ordens, mounted]);

  // Métricas rápidas
  const totalPatio = ordens.filter((o) => o.status !== 'FINALIZADO' && o.status !== 'CANCELADO').length;
  const totalAprovados = ordens.filter((o) => o.status === 'APROVADO').length;
  const totalOrcamento = ordens.filter((o) => o.status === 'ORCAMENTO').length;

  const handleSimularAprovacao = async (id: string, codigo: string) => {
    await aprovarOrçamento(id);
    setRealtimeNotification(`Simulação: OS ${codigo} marcada como APROVADO via Realtime!`);
    setTimeout(() => setRealtimeNotification(null), 5000);
  };

  const getStatusBadge = (status: StatusOS) => {
    switch (status) {
      case 'ORCAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Orçamento Pendente
          </span>
        );
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 glow-emerald">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Aprovado pelo Cliente
          </span>
        );
      case 'EM_SERVICO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Wrench className="w-3.5 h-3.5 text-blue-400" />
            No Elevador / Serviço
          </span>
        );
      case 'FINALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Entregue / Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notificação Realtime */}
      {realtimeNotification && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-500 text-slate-950 px-4 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <span>{realtimeNotification}</span>
          </div>
          <button 
            onClick={() => setRealtimeNotification(null)}
            className="text-xs bg-slate-950/20 px-2 py-1 rounded hover:bg-slate-950/30"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Industrial */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold tracking-tight text-base text-white">OficinaOS</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                  DEMO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-emerald-400 font-semibold">Supabase Realtime</span>
              </p>
            </div>
          </div>

          {/* Botão Ação Rápida: Nova OS */}
          <Link
            href="/nova-os"
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova OS</span>
          </Link>
        </div>

        {/* Dropdown Seletor de Oficinas (Modo Demo) */}
        <div className="max-w-md mx-auto mt-3">
          <div className="relative">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block flex items-center justify-between">
              <span>Oficina Ativa (Alternar Modo Demo)</span>
              <span className="text-amber-400 font-medium lowercase">troca rápida</span>
            </label>
            <div className="relative">
              <select
                value={selectedOficinaId}
                onChange={(e) => setSelectedOficinaId(e.target.value)}
                className="w-full appearance-none bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-semibold rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer"
              >
                {oficinas.map((oficina) => (
                  <option key={oficina.id} value={oficina.id} className="bg-slate-900 text-white py-1">
                    🏢 {oficina.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-3 flex-1">
        {/* Painel de Métricas Rápidas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pátio Total</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{totalPatio}</div>
          </div>
          <div className="bg-slate-900/80 border border-amber-500/20 p-2.5 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-amber-400">Aguardando</div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">{totalOrcamento}</div>
          </div>
          <div className="bg-slate-900/80 border border-emerald-500/20 p-2.5 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Aprovados</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{totalAprovados}</div>
          </div>
        </div>

        {/* Duas Abas Principais */}
        <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex gap-1 mb-4 shadow-inner">
          <button
            onClick={() => setActiveTab('patio')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'patio'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Pátio Agora ({patioOrdens.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all relative ${
              activeTab === 'alertas'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-inherit" />
            <span>Retorno 6M</span>
            {alertasRetorno.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'alertas' ? 'bg-slate-950 text-emerald-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {alertasRetorno.length}
              </span>
            )}
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: PÁTIO AGORA */}
        {activeTab === 'patio' && (
          <div className="space-y-3">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por placa, modelo ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 text-xs text-white rounded-xl pl-9.5 pr-4 py-2.5 focus:outline-none transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Listagem de Ordens de Serviço */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                <p className="text-xs">Carregando ordens de serviço...</p>
              </div>
            ) : patioOrdens.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma OS encontrada</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Cadastre a primeira OS rápida agora mesmo.</p>
                <Link
                  href="/nova-os"
                  className="inline-flex items-center gap-1.5 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Nova OS
                </Link>
              </div>
            ) : (
              patioOrdens.map((os) => {
                const publicUrl = typeof window !== 'undefined'
                  ? `${window.location.origin}/os/${os.id}`
                  : `/os/${os.id}`;

                const whatsAppLink = generateWhatsAppLinkParaCliente(os, currentOficina?.nome || 'Oficina', publicUrl);

                return (
                  <div
                    key={os.id}
                    className={`bg-slate-900/90 rounded-2xl border transition-all duration-300 p-4 shadow-lg ${
                      os.status === 'APROVADO'
                        ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Linha Superior: Placa estilo Mercosul + Código + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {/* Placa estilo Mercosul */}
                        <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm bg-slate-950 text-center flex flex-col justify-center min-w-[84px]">
                          <div className="bg-blue-600 text-[8px] font-black tracking-widest text-white py-0.5 px-1 uppercase flex items-center justify-between">
                            <span>BRASIL</span>
                            <span className="w-1.5 h-1 rounded-xs bg-yellow-400 inline-block" />
                          </div>
                          <div className="font-mono font-black text-xs text-white px-2 py-0.5 tracking-wider">
                            {os.veiculo_placa}
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] font-mono text-slate-400 font-semibold block">
                            {os.codigo_curto}
                          </span>
                          <h2 className="text-sm font-bold text-white leading-tight">
                            {os.veiculo_modelo}
                          </h2>
                        </div>
                      </div>

                      {/* Badge de Status */}
                      <div>{getStatusBadge(os.status)}</div>
                    </div>

                    {/* Detalhes do Cliente e KM */}
                    <div className="bg-slate-950/60 rounded-xl p-2.5 mb-3 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="font-semibold text-slate-200 truncate">{os.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0 font-mono text-[11px]">
                        <Gauge className="w-3.5 h-3.5 text-amber-500" />
                        <span>{os.km_atual.toLocaleString('pt-BR')} km</span>
                      </div>
                    </div>

                    {/* Fotos de Entrada Miniaturas (se houver) */}
                    {os.fotos_entrada && os.fotos_entrada.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                        {os.fotos_entrada.map((foto, idx) => (
                          <div
                            key={idx}
                            className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 bg-slate-950 relative group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={foto}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                        ))}
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {os.fotos_entrada.length} {os.fotos_entrada.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </div>
                    )}

                    {/* Valor Total e Data de Aprovação */}
                    <div className="flex items-baseline justify-between border-t border-slate-800/80 pt-2.5 mb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Valor Total
                        </span>
                        <span className="text-lg font-black text-emerald-400">
                          R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {mounted && os.aprovado_em && (
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-emerald-500 block">
                            Aprovado em
                          </span>
                          <span className="text-[11px] text-slate-300 font-mono">
                            {new Date(os.aprovado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({new Date(os.aprovado_em).toLocaleDateString('pt-BR')})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação Mobile */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botão Link Público */}
                      <Link
                        href={`/os/${os.id}`}
                        className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-700 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>Abrir Link Público</span>
                      </Link>

                      {/* Botão WhatsApp */}
                      <a
                        href={whatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl shadow-md shadow-emerald-950 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Chamar WhatsApp</span>
                      </a>
                    </div>

                    {/* Botão de Demonstração Rápida: Simular Aprovação do Cliente */}
                    {os.status === 'ORCAMENTO' && (
                      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-amber-400/80 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Modo Demo:
                        </span>
                        <button
                          onClick={() => handleSimularAprovacao(os.id, os.codigo_curto)}
                          className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 flex items-center gap-1"
                        >
                          Simular Aprovação do Cliente agora
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: ALERTAS DE RETORNO (6 MESES) */}
        {activeTab === 'alertas' && (
          <div className="space-y-3">
            {/* Banner Informativo de Retenção */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-amber-300">
                    Máquina de Vendas: Alertas Preventivos de 6 Meses
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Clientes com revisão programada vencida ou próxima (15 dias). Clique para enviar lembrete pronto e recuperar faturamento!
                  </p>
                </div>
              </div>
            </div>

            {/* Listagem de Alertas */}
            {alertasRetorno.length === 0 ? (
              <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-200">Nenhum cliente vencido no momento</p>
                <p className="text-xs text-slate-500 mt-1">
                  Todas as revisões e trocas de óleo estão em dia.
                </p>
              </div>
            ) : (
              alertasRetorno.map((os) => {
                const revisaoLink = generateWhatsAppRevisaoLink(os, currentOficina?.nome || 'Oficina Mecânica');
                const dataFormatada = mounted && os.data_proximo_retorno
                  ? new Date(os.data_proximo_retorno).toLocaleDateString('pt-BR')
                  : os.data_proximo_retorno || 'N/A';

                return (
                  <div
                    key={os.id}
                    className={`bg-slate-900 rounded-2xl border p-4 shadow-lg ${
                      os.isVencido
                        ? 'border-rose-500/40 bg-gradient-to-b from-slate-900 to-rose-950/15'
                        : 'border-amber-500/40 bg-gradient-to-b from-slate-900 to-amber-950/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-950 rounded border border-slate-700 text-slate-200">
                            {os.veiculo_placa}
                          </span>
                          <span className="text-xs font-bold text-white">{os.veiculo_modelo}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Cliente: <strong className="text-slate-200">{os.cliente_nome}</strong>
                        </p>
                      </div>

                      {/* Badge de Vencimento */}
                      <div>
                        {os.isVencido ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            🚨 Vencido há {Math.abs(os.diffDays)} dias
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            ⏳ Vence em {os.diffDays === 0 ? 'Hoje' : `${os.diffDays} dias`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 rounded-xl p-2.5 my-2.5 border border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Data do Retorno:</span>
                        <strong className="text-slate-200">{dataFormatada}</strong>
                      </div>
                      <div className="font-mono">
                        Último KM: <strong>{os.km_atual.toLocaleString('pt-BR')}</strong>
                      </div>
                    </div>

                    {/* Botão de Reativação no WhatsApp */}
                    <a
                      href={revisaoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wide"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>Reativar Cliente no WhatsApp</span>
                    </a>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Barra de Navegação Inferior Mobile-First */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-6 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('patio')}
            className={`flex flex-col items-center gap-1 py-1 transition-all ${
              activeTab === 'patio' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Car className="w-5 h-5" />
            <span className="text-[10px] font-bold">Pátio</span>
          </button>

          <Link
            href="/nova-os"
            className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 w-12 h-12 rounded-full shadow-xl shadow-emerald-500/30 border-4 border-slate-950 active:scale-90 transition-transform font-black"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </Link>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`flex flex-col items-center gap-1 py-1 transition-all ${
              activeTab === 'alertas' ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px] font-bold">Retorno 6M</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
