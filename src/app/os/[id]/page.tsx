'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { 
  Wrench, 
  CheckCircle2, 
  ShieldCheck, 
  MessageCircle, 
  Package, 
  Gauge, 
  Calendar, 
  Camera, 
  Sparkles, 
  Check, 
  AlertCircle,
  User,
  Car,
  X
} from 'lucide-react';
import { OrdemServico, ItemOS, Oficina } from '@/types/database';
import { 
   fetchOrdemServicoById, 
   aprovarOrçamento, 
   formatWhatsAppNumber, 
   detectarDispositivoCliente, 
   gerarHashAuditoria 
} from '@/lib/osService';
import { useIsHydrated } from '@/lib/authService';
import PitTrackLogo from '@/components/PitTrackLogo';

export default function OSClientePublicaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center animate-spin mb-4 border border-emerald-500/20">
            <Wrench className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-200">Carregando orçamento...</p>
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

  const isHydrated = useIsHydrated();
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [itens, setItens] = useState<ItemOS[]>([]);
  const [oficina, setOficina] = useState<Oficina | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isApprovedSuccess, setIsApprovedSuccess] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
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

  // Função de Aprovação com Confetes e Trilha de Auditoria
  const handleAprovar = async () => {
    if (!os) return;
    setIsApproving(true);

    try {
      const resultado = await aprovarOrçamento(os.id);
      if (resultado.ok) {
        setIsApprovedSuccess(true);
        setOs((prev) =>
          prev
            ? {
                ...prev,
                status: 'APROVADO',
                aprovado_em: resultado.aprovado_em,
                aprovado_dispositivo: `${resultado.aprovado_dispositivo} [${resultado.protocolo}]`,
              }
            : null
        );

        try {
          confetti({
            particleCount: 130,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#38bdf8', '#a855f7', '#ffffff']
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
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center animate-spin mb-4 border border-emerald-500/20">
          <Wrench className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-200">Carregando orçamento do seu veículo...</p>
        <p className="text-xs text-[#8b9eb0] mt-1">Conexão segura com a oficina</p>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto selection:bg-rose-500 selection:text-white">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">Orçamento Não Localizado</h2>
        <p className="text-xs text-[#8b9eb0] mt-2 mb-6 leading-relaxed">
          Não conseguimos encontrar os detalhes deste orçamento. Certifique-se de que utilizou o link completo enviado pela oficina no seu WhatsApp.
        </p>
        <div className="w-full bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 text-xs text-[#8b9eb0] space-y-1 text-left">
          <div className="font-bold text-slate-200">Precisa de ajuda?</div>
          <p className="text-[11px] text-[#5c7287]">
            Responda à mensagem da sua oficina mecânica no WhatsApp solicitando o reenvio do link de aprovação.
          </p>
        </div>
        <span className="text-[10px] text-[#5c7287] font-mono mt-8">
          JS OrçaFácil • Plataforma Segura
        </span>
      </div>
    );
  }

  // Separar itens por Serviços Técnicos e Peças
  const services = itens.filter((i) => i.tipo === 'MAO_DE_OBRA');
  const parts = itens.filter((i) => i.tipo === 'PECA');
  const serviceTotal = services.reduce((s, i) => s + Number(i.valor), 0);
  const partsTotal = parts.reduce((s, i) => s + Number(i.valor), 0);
  const brandColor = oficina?.cor_primaria || '#22c55e';

  const oficinaWhatsPhone = oficina?.whatsapp ? formatWhatsAppNumber(oficina.whatsapp) : '5511999998888';
  const duvidaWhatsLink = `https://wa.me/${oficinaWhatsPhone}?text=${encodeURIComponent(
    `Olá, gostaria de tirar uma dúvida sobre o orçamento ${os.codigo_curto} do meu veículo ${os.veiculo_modelo} (Placa ${os.veiculo_placa}).`
  )}`;

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex flex-col pb-36 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Header com Logotipo Individual e Cor da Oficina */}
      <header className="sticky top-0 z-30 bg-[#080d14]/95 backdrop-blur-md border-b border-[#1c2e42] px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <PitTrackLogo
            size="sm"
            logoUrl={oficina?.logo_url}
            corPrimaria={brandColor}
            nomeOficina={oficina?.nome}
          />

          <a
            href={duvidaWhatsLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: brandColor,
              backgroundColor: `${brandColor}18`,
              borderColor: `${brandColor}40`,
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold border px-3 py-1.5 rounded-xl transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>Falar c/ Oficina</span>
          </a>
        </div>
      </header>

      {/* Main Container Mobile Fiel à Imagem de Referência */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1 space-y-4">
        
        {/* Banner de Veículo Pronto ou Orçamento Aprovado */}
        {os.status === 'FINALIZADO' ? (
          <div
            style={{ borderColor: `${brandColor}70`, backgroundColor: `${brandColor}15` }}
            className="border rounded-2xl p-4 shadow-lg animate-in fade-in zoom-in-95 duration-300"
          >
            <div className="flex items-start gap-3">
              <div
                style={{ backgroundColor: brandColor }}
                className="w-10 h-10 rounded-xl text-slate-950 flex items-center justify-center flex-shrink-0 font-bold shadow-md"
              >
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 style={{ color: brandColor }} className="text-sm font-extrabold flex items-center gap-1.5">
                  <span>VEÍCULO PRONTO PARA RETIRADA!</span>
                  <Sparkles className="w-4 h-4" />
                </h3>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                  Todos os serviços técnicos do seu <strong>{os.veiculo_modelo}</strong> foram concluídos pela equipe da <strong>{oficina?.nome || 'oficina'}</strong>. Seu veículo já está liberado para retirada!
                </p>
              </div>
            </div>
          </div>
        ) : isApprovedSuccess ? (
          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/50 rounded-2xl p-4 shadow-lg animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold shadow-md shadow-emerald-500/30">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-1.5">
                  <span>ORÇAMENTO APROVADO!</span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  A oficina {oficina?.nome || 'mecânica'} já recebeu a sua autorização em tempo real e a equipe mecânica iniciou o processo de separação de peças e execução do serviço.
                </p>
                {isHydrated && os.aprovado_em && (
                  <div className="mt-2.5 pt-2.5 border-t border-emerald-500/30 space-y-1 text-[10px] font-mono text-emerald-300/90">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Carimbo de Tempo:</span>
                      <span className="font-bold text-emerald-300">
                        {new Date(os.aprovado_em).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Dispositivo:</span>
                      <span className="text-slate-200 truncate max-w-[190px]">
                        {os.aprovado_dispositivo
                          ? os.aprovado_dispositivo.replace(/\s*\[AUD-[A-Z0-9-]+\]/, '')
                          : detectarDispositivoCliente()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Protocolo Digital:</span>
                      <span className="bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                        {gerarHashAuditoria(os.id, os.aprovado_em)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Card 1: Work Order Title + Status Pill + Customer + Vehicle (Fiel ao Mockup do Telefone) */}
        <div className="bg-[#0e1724] rounded-2xl border border-[#1c2e42] p-4 shadow-xl space-y-3">
          
          {/* Título e Badge de Status */}
          <div className="flex items-center justify-between border-b border-[#182738] pb-3">
            <h2 className="text-lg font-black text-white tracking-tight">
              Ordem de Serviço #{os.codigo_curto}
            </h2>
            <span
              style={
                os.status === 'FINALIZADO' || isApprovedSuccess
                  ? { backgroundColor: brandColor, borderColor: brandColor }
                  : undefined
              }
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                os.status === 'FINALIZADO' || isApprovedSuccess
                  ? 'text-slate-950 font-black shadow-md'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {os.status === 'FINALIZADO'
                ? 'Pronto p/ Retirada'
                : isApprovedSuccess
                ? 'Aprovado'
                : 'Em Aberto'}
            </span>
          </div>

          {/* Dados do Cliente (User Icon) */}
          <div className="flex items-center gap-2 text-xs">
            <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-white">
              {os.cliente_nome}
            </span>
          </div>

          {/* Dados do Veículo (Car Icon) + Placa / VIN */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-2 text-[#8b9eb0]">
              <Car className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-medium text-white truncate">
                {os.veiculo_modelo}
              </span>
            </div>
            <span className="font-mono font-bold text-xs bg-[#0b121b] border border-[#1c2e42] px-2 py-0.5 rounded text-white flex-shrink-0">
              {os.veiculo_placa}
            </span>
          </div>

          {/* Odômetro e Data de Entrada */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#182738] text-[11px] text-[#8b9eb0]">
            <div className="flex items-center gap-1.5 font-mono">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>{os.km_atual ? `${os.km_atual.toLocaleString('pt-BR')} km` : 'KM não inf.'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono justify-end">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isHydrated ? new Date(os.created_at).toLocaleDateString('pt-BR') : os.created_at.split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Fotos de Entrada (Check-in) com Zoom */}
        {os.fotos_entrada && os.fotos_entrada.length > 0 && (
          <div className="bg-[#0e1724] rounded-2xl border border-[#1c2e42] p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Fotos do Check-in na Oficina</span>
              </span>
              <span className="text-[10px] text-[#8b9eb0]">
                {os.fotos_entrada.length} {os.fotos_entrada.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {os.fotos_entrada.map((foto, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(foto)}
                  className="aspect-video rounded-xl overflow-hidden border border-[#1c2e42] bg-[#091018] cursor-pointer group relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-[#080d14]/20 group-hover:bg-transparent transition-colors" />
                  <span className="absolute bottom-1 right-1 bg-[#080d14]/80 text-[9px] text-slate-300 px-1.5 py-0.5 rounded">
                    Toque para ampliar
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            CARD 2: SERVIÇOS TÉCNICOS
        ========================================================================= */}
        {services.length > 0 && (
          <div className="bg-[#0e1724] rounded-2xl border border-[#1c2e42] p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2.5">
              <Wrench className="w-4 h-4" style={{ color: brandColor }} />
              <h3 className="text-sm font-black text-white tracking-tight">Serviços Técnicos</h3>
            </div>

            <div className="space-y-2.5">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs text-[#cbd5e1]">
                  <span className="pr-2">{s.descricao}</span>
                  <span className="font-mono font-bold text-white flex-shrink-0">
                    R$ {Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Subtotal Serviço Técnico */}
            <div className="border-t border-[#182738] pt-2.5 flex items-center justify-between text-xs font-bold">
              <span className="text-[#8b9eb0]">Total de Serviço Técnico</span>
              <span className="text-white font-mono font-extrabold">
                R$ {serviceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            CARD 3: PARTS (Peças) - Fiel ao Mockup do iPhone
        ========================================================================= */}
        {parts.length > 0 && (
          <div className="bg-[#0e1724] rounded-2xl border border-[#1c2e42] p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2.5">
              <Package className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-white tracking-tight">Peças & Componentes</h3>
            </div>

            <div className="space-y-2.5">
              {parts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-[#cbd5e1]">
                  <span className="pr-2">{p.descricao}</span>
                  <span className="font-mono font-bold text-white flex-shrink-0">
                    R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Subtotal Parts Total */}
            <div className="border-t border-[#182738] pt-2.5 flex items-center justify-between text-xs font-bold">
              <span className="text-[#8b9eb0]">Total de Peças</span>
              <span className="text-white font-mono font-extrabold">
                R$ {partsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            CARD 4: ESTIMATED TOTAL (Com a Cor Padrão da Oficina)
        ========================================================================= */}
        <div className="bg-[#091018] rounded-2xl border border-[#1c2e42] p-4 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold text-[#8b9eb0] tracking-wider block">
              Valor Total do Orçamento
            </span>
            <span className="text-[10px] text-[#5c7287]">Garantia legal de 90 dias</span>
          </div>
          <span
            style={{ color: brandColor }}
            className="text-2xl font-black font-mono tracking-tight"
          >
            R$ {Number(os.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Selo de Garantia, Normas ABNT e Conformidade LGPD */}
        <div className="bg-[#0e1724]/60 border border-[#1c2e42] rounded-xl p-3.5 space-y-2 text-xs text-[#8b9eb0]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              Peças com garantia legal de 90 dias (Art. 26 do CDC) e serviços executados segundo normas técnicas.
            </span>
          </div>
          <p className="text-[10px] text-[#5c7287] border-t border-[#182738] pt-2 leading-relaxed">
            🔒 <strong className="text-slate-400">Proteção de Dados (LGPD — Lei nº 13.709/2018):</strong> Os dados deste veículo, fotos de check-in e contato são utilizados exclusivamente pela oficina responsável para execução do serviço, emissão de garantia e avisos de revisão preventiva. Tecnologia fornecida por <strong className="text-slate-300">JS OrçaFácil (Jonatan Severo Tech)</strong>.
          </p>
        </div>
      </main>

      {/* Modal Zoom da Foto */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-[#080d14]/95 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-lg w-full max-h-[85vh] rounded-2xl overflow-hidden border border-[#1c2e42]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto} alt="Foto Ampliada" className="w-full h-full object-contain" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 bg-[#0e1724] text-white p-2 rounded-full text-xs font-bold border border-[#1c2e42]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          BARRA DE AÇÃO FIXA INFERIOR MOBILE - Botão Verde Vibrante (Update Status)
      ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080d14]/95 backdrop-blur-xl border-t border-[#1c2e42] px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          {os.status === 'FINALIZADO' ? (
            <div
              style={{
                backgroundColor: `${brandColor}20`,
                borderColor: `${brandColor}50`,
                color: brandColor,
              }}
              className="w-full border font-black text-xs py-3.5 px-4 rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>SERVIÇO CONCLUÍDO • VEÍCULO PRONTO PARA RETIRADA</span>
            </div>
          ) : isApprovedSuccess ? (
            <div className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs py-3.5 px-4 rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>ORÇAMENTO JÁ APROVADO COM SUCESSO</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isApproving}
              onClick={handleAprovar}
              style={{ backgroundColor: brandColor }}
              className="w-full flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 text-slate-950 font-black text-sm py-4 px-4 rounded-2xl shadow-xl transition-all uppercase tracking-wide cursor-pointer"
            >
              {isApproving ? (
                <span>Confirmando Aprovação...</span>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>APROVAR ORÇAMENTO AGORA</span>
                </>
              )}
            </button>
          )}

          {/* Link Secundário: Dúvidas */}
          <a
            href={duvidaWhatsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 text-xs text-[#8b9eb0] hover:text-white py-1 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dúvidas antes de aprovar? Fale com a oficina no WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
