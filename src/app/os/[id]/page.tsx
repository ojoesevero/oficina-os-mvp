'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { 
  Wrench, 
  Car, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Phone, 
  MessageCircle, 
  ChevronRight, 
  Package, 
  Gauge, 
  Calendar, 
  Camera, 
  FileText, 
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { OrdemServico, ItemOS, Oficina } from '@/types/database';
import { fetchOrdemServicoById, aprovarOrçamento, formatWhatsAppNumber } from '@/lib/osService';

export default function OSClientePublicaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin mb-4">
            <Wrench className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-300">Carregando orçamento...</p>
        </div>
      }
    >
      <OSClienteContent />
    </Suspense>
  );
}

function OSClienteContent() {
  const params = useParams();
  const id = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [itens, setItens] = useState<ItemOS[]>([]);
  const [oficina, setOficina] = useState<Oficina | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isApprovedSuccess, setIsApprovedSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!id) return;

    async function loadData() {
      setIsLoading(true);
      const res = await fetchOrdemServicoById(id);
      if (res) {
        setOs(res.os);
        setItens(res.itens);
        setOficina(res.oficina || null);
        if (res.os.status === 'APROVADO' || res.os.status === 'EM_SERVICO' || res.os.status === 'FINALIZADO') {
          setIsApprovedSuccess(true);
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [id]);

  // Função de Aprovação com Confetes
  const handleAprovar = async () => {
    if (!os) return;
    setIsApproving(true);

    try {
      const ok = await aprovarOrçamento(os.id);
      if (ok) {
        setIsApprovedSuccess(true);
        setOs((prev) => prev ? { ...prev, status: 'APROVADO', aprovado_em: new Date().toISOString() } : null);

        // Disparar confetes visuais festivos
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#f59e0b', '#3b82f6', '#ffffff']
          });
        } catch {
          // ignore confetti if blocked
        }
      }
    } catch (err) {
      console.error('Erro ao aprovar:', err);
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin mb-4">
          <Wrench className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-300">Carregando orçamento do seu veículo...</p>
        <p className="text-xs text-slate-500 mt-1">Conexão segura com a oficina</p>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-black text-white">Orçamento Não Encontrado</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Não conseguimos localizar este orçamento. Verifique se o link está correto ou entre em contato com a oficina.
        </p>
        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700"
        >
          Voltar para Início
        </Link>
      </div>
    );
  }

  // Separar itens por tipo
  const pecas = itens.filter((i) => i.tipo === 'PECA');
  const maoDeObra = itens.filter((i) => i.tipo === 'MAO_DE_OBRA');
  const totalPecas = pecas.reduce((s, i) => s + Number(i.valor), 0);
  const totalMaoDeObra = maoDeObra.reduce((s, i) => s + Number(i.valor), 0);

  const oficinaWhatsPhone = oficina?.whatsapp ? formatWhatsAppNumber(oficina.whatsapp) : '5511999998888';
  const duvidaWhatsLink = `https://wa.me/${oficinaWhatsPhone}?text=${encodeURIComponent(
    `Olá, gostaria de tirar uma dúvida sobre o orçamento ${os.codigo_curto} do meu veículo ${os.veiculo_modelo} (Placa ${os.veiculo_placa}).`
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-36 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header da Oficina Mecânica */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm text-white leading-tight">
                  {oficina?.nome || 'Oficina Mecânica'}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
              </div>
              <span className="text-[10px] text-slate-400 block">Orçamento Digital Verificado</span>
            </div>
          </div>

          <a
            href={duvidaWhatsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>Falar c/ Oficina</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1 space-y-4">
        {/* Banner de Status se já estiver Aprovado */}
        {isApprovedSuccess && (
          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/50 rounded-2xl p-4 shadow-lg animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold shadow-md shadow-emerald-500/30">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
                  <span>ORÇAMENTO APROVADO!</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  A oficina já recebeu a sua autorização em tempo real e a equipe mecânica iniciou o processo de separação de peças e execução do serviço.
                </p>
                {mounted && os.aprovado_em && (
                  <p className="text-[10px] text-emerald-400/80 font-mono mt-1.5">
                    Data da aprovação: {new Date(os.aprovado_em).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card do Veículo e Cliente */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Código: {os.codigo_curto}
              </span>
              <h2 className="text-base font-black text-white mt-0.5">
                {os.veiculo_modelo}
              </h2>
            </div>

            {/* Placa Mercosul Estilizada */}
            <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm bg-slate-950 text-center flex flex-col justify-center min-w-[80px]">
              <div className="bg-blue-600 text-[8px] font-black tracking-widest text-white py-0.5 px-1 uppercase flex items-center justify-between">
                <span>BRASIL</span>
                <span className="w-1.5 h-1 rounded-xs bg-yellow-400 inline-block" />
              </div>
              <div className="font-mono font-black text-xs text-white px-2 py-0.5 tracking-wider">
                {os.veiculo_placa}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">Odômetro / KM:</span>
                <span className="font-mono font-bold text-slate-200">
                  {os.km_atual ? `${os.km_atual.toLocaleString('pt-BR')} km` : 'Não inf.'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block">Data de Entrada:</span>
                <span className="font-mono font-bold text-slate-200">
                  {mounted ? new Date(os.created_at).toLocaleDateString('pt-BR') : os.created_at.split('T')[0]}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 px-1">
            <span>Proprietário: <strong className="text-slate-200">{os.cliente_nome}</strong></span>
            <span className="text-[10px] text-slate-500 font-mono">Status: {os.status}</span>
          </div>
        </div>

        {/* Fotos de Entrada (Check-in) */}
        {os.fotos_entrada && os.fotos_entrada.length > 0 && (
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Fotos de Check-in na Oficina</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {os.fotos_entrada.length} {os.fotos_entrada.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {os.fotos_entrada.map((foto, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(foto)}
                  className="aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt={`Foto do veículo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />
                  <span className="absolute bottom-1 right-1 bg-slate-950/80 text-[9px] text-slate-300 px-1.5 py-0.5 rounded">
                    Toque para ampliar
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela / Lista Discriminada de Itens */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Discriminação do Orçamento</span>
            </h3>
            <span className="text-[11px] text-slate-400">Transparência Total</span>
          </div>

          {/* Peças e Materiais */}
          {pecas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Peças e Insumos ({pecas.length})</span>
                </span>
                <span className="font-mono">
                  R$ {totalPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5 pl-1 pr-1">
                {pecas.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50">
                    <span className="text-slate-300 leading-snug pr-2">{item.descricao}</span>
                    <span className="font-mono font-semibold text-slate-200 flex-shrink-0">
                      R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Serviços e Mão de Obra */}
          {maoDeObra.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300/90 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Mão de Obra e Serviços ({maoDeObra.length})</span>
                </span>
                <span className="font-mono">
                  R$ {totalMaoDeObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5 pl-1 pr-1">
                {maoDeObra.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50">
                    <span className="text-slate-300 leading-snug pr-2">{item.descricao}</span>
                    <span className="font-mono font-semibold text-slate-200 flex-shrink-0">
                      R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo Financeiro Final */}
          <div className="bg-slate-950/90 rounded-xl p-3 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal Peças:</span>
              <span className="font-mono">R$ {totalPecas.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal Mão de Obra:</span>
              <span className="font-mono">R$ {totalMaoDeObra.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                  Valor Total Investido
                </span>
                <span className="text-[10px] text-slate-500">Garantia legal de 90 dias</span>
              </div>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Garantia e Segurança */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>
            Peças com garantia de fábrica e serviços executados de acordo com as normas ABNT.
          </span>
        </div>
      </main>

      {/* Modal Zoom da Foto */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full max-h-[85vh] rounded-2xl overflow-hidden border border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto} alt="Foto Ampliada" className="w-full h-full object-contain" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 bg-slate-900/90 text-white p-2 rounded-full text-xs font-bold"
            >
              ✕ Fechar
            </button>
          </div>
        </div>
      )}

      {/* Barra de Ação Fixa Inferior Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          {isApprovedSuccess ? (
            <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs py-3.5 px-4 rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>ORÇAMENTO JÁ APROVADO COM SUCESSO</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isApproving}
              onClick={handleAprovar}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 active:scale-98 text-slate-950 font-black text-sm py-4 px-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all uppercase tracking-wide glow-emerald"
            >
              {isApproving ? (
                <span>Confirmando Aprovação...</span>
              ) : (
                <>
                  <span className="text-base">✅</span>
                  <span>APROVAR ORÇAMENTO AGORA</span>
                </>
              )}
            </button>
          )}

          {/* Botão Secundário: Tirar Dúvidas no WhatsApp */}
          <a
            href={duvidaWhatsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Dúvidas antes de aprovar? Fale com a oficina no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
