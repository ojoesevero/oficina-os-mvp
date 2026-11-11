'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Trash2, 
  Wrench, 
  Package, 
  CheckCircle2, 
  Loader2, 
  MessageCircle, 
  AlertCircle,
  X,
  Building2,
  Car,
  User
} from 'lucide-react';
import { uploadFotoOS, createOrdemServico, generateWhatsAppLinkParaCliente, fetchOficinas } from '@/lib/osService';
import { useCurrentOficina, useIsHydrated, setCurrentOficina } from '@/lib/authService';
import { maskPlaca, unmaskPlaca, maskPhone, unmaskPhone, maskKM, unmaskKM } from '@/utils/masks';
import PitTrackLogo from '@/components/PitTrackLogo';

interface ItemForm {
  tipo: 'PECA' | 'MAO_DE_OBRA';
  descricao: string;
  valor: number | string;
}

const SUGESTOES_RAPIDAS = [
  { tipo: 'PECA' as const, descricao: 'Óleo Motor 5W30 Sintético (4L)', valor: 260 },
  { tipo: 'PECA' as const, descricao: 'Filtro de Óleo + Filtro de Combustível', valor: 95 },
  { tipo: 'PECA' as const, descricao: 'Jogo de Pastilhas de Freio Dianteiras', valor: 280 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Revisão Básica e Troca de Filtros', valor: 150 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Alinhamento 3D + Balanceamento 4 Rodas', valor: 140 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Serviço Técnico: Freios Dianteiros e Sangria', valor: 220 },
];

export default function NovaOSPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Reativos de Autenticação e Oficina
  const currentOficina = useCurrentOficina();
  const isHydrated = useIsHydrated();
  const brandColor = currentOficina?.cor_primaria || '#22c55e';

  // Dados do Veículo e Cliente
  const [veiculoPlaca, setVeiculoPlaca] = useState('');
  const [veiculoModelo, setVeiculoModelo] = useState('');
  const [kmAtual, setKmAtual] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');

  // Fotos
  const [fotos, setFotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Itens da OS
  const [itens, setItens] = useState<ItemForm[]>([
    { tipo: 'PECA', descricao: 'Óleo Sintético 5W30 + Filtro', valor: 280 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Serviço Técnico: Troca e Check-up 20 Itens', valor: 150 }
  ]);

  // Novo item em edição
  const [novoTipo, setNovoTipo] = useState<'PECA' | 'MAO_DE_OBRA'>('PECA');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');

  // Estado de envio
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOSData, setCreatedOSData] = useState<{ id: string; codigo_curto: string; whatsAppLink: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Verificar sessão da oficina sem setState cascading e sincronizar catálogo do Admin
  useEffect(() => {
    if (isHydrated && !currentOficina) {
      router.replace('/login?returnTo=/nova-os');
      return;
    }
    if (isHydrated && currentOficina) {
      fetchOficinas().then((lista) => {
        const atualizada = lista.find((o) => o.id === currentOficina.id);
        if (atualizada && JSON.stringify(atualizada) !== JSON.stringify(currentOficina)) {
          setCurrentOficina(atualizada);
        }
      });
    }
  }, [isHydrated, currentOficina, router]);

  const catalogoOficina =
    currentOficina?.servicos_rapidos && currentOficina.servicos_rapidos.length > 0
      ? currentOficina.servicos_rapidos
      : SUGESTOES_RAPIDAS;

  // Calcular subtotais (Peças vs Serviços Técnicos) e valor total dinâmico
  const subtotalPecas = itens
    .filter((item) => item.tipo === 'PECA')
    .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const subtotalServicos = itens
    .filter((item) => item.tipo === 'MAO_DE_OBRA')
    .reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const valorTotal = subtotalPecas + subtotalServicos;

  // Upload de fotos
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    setErrorMsg('');

    try {
      const uploadPromises = Array.from(files).map((file) => uploadFotoOS(file));
      const urls = await Promise.all(uploadPromises);
      setFotos((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao processar upload de foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Adicionar item
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novaDescricao.trim()) {
      setErrorMsg('Informe a descrição do item.');
      return;
    }
    const val = parseFloat(novoValor.replace(',', '.')) || 0;
    if (val <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    setItens((prev) => [
      ...prev,
      {
        tipo: novoTipo,
        descricao: novaDescricao.trim(),
        valor: val,
      },
    ]);

    setNovaDescricao('');
    setNovoValor('');
    setErrorMsg('');
  };

  const handleAddSugestao = (sugestao: { tipo: 'PECA' | 'MAO_DE_OBRA'; descricao: string; valor: number }) => {
    setItens((prev) => [
      ...prev,
      {
        tipo: sugestao.tipo,
        descricao: sugestao.descricao,
        valor: sugestao.valor,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  // Salvar OS e Enviar para Cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentOficina) {
      setErrorMsg('Sessão expirada. Faça login novamente.');
      return;
    }
    if (!veiculoPlaca.trim()) {
      setErrorMsg('A placa do veículo é obrigatória.');
      return;
    }
    if (!veiculoModelo.trim()) {
      setErrorMsg('O modelo do veículo é obrigatório.');
      return;
    }
    if (!clienteNome.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }
    if (!clienteWhatsapp.trim()) {
      setErrorMsg('O WhatsApp do cliente é obrigatório.');
      return;
    }
    if (itens.length === 0) {
      setErrorMsg('Adicione pelo menos um item (peça ou mão de obra).');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPlaca = unmaskPlaca(veiculoPlaca);
      const cleanPhone = unmaskPhone(clienteWhatsapp);
      const cleanKM = unmaskKM(kmAtual);

      const itensNormalizados = itens.map((it) => ({
        tipo: it.tipo,
        descricao: it.descricao,
        valor: Number(it.valor),
      }));

      const result = await createOrdemServico({
        oficina_id: currentOficina.id,
        cliente_nome: clienteNome,
        cliente_whatsapp: cleanPhone,
        veiculo_placa: cleanPlaca,
        veiculo_modelo: veiculoModelo,
        km_atual: cleanKM,
        fotos_entrada: fotos,
        itens: itensNormalizados,
      });

      const publicUrl = `${window.location.origin}/os/${result.id}`;
      const whatsAppLink = generateWhatsAppLinkParaCliente(
        {
          cliente_nome: clienteNome,
          cliente_whatsapp: cleanPhone,
          veiculo_modelo: veiculoModelo,
          veiculo_placa: cleanPlaca,
          codigo_curto: result.codigo_curto,
          id: result.id,
          valor_total: valorTotal,
          itens: itensNormalizados,
        },
        currentOficina.nome,
        publicUrl
      );

      setCreatedOSData({
        id: result.id,
        codigo_curto: result.codigo_curto,
        whatsAppLink,
      });

      window.open(whatsAppLink, '_blank');
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar a Ordem de Serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || !currentOficina) {
    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center animate-spin mb-4 border border-emerald-500/20">
          <Loader2 className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-200">Carregando formulário de OS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex flex-col pb-36 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Header com Botão de Voltar e Logo PitTrack */}
      <header className="sticky top-0 z-30 bg-[#080d14]/95 backdrop-blur-md border-b border-[#1c2e42] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#8b9eb0] hover:text-white bg-[#0e1724] hover:bg-[#152336] active:scale-95 text-xs font-bold min-h-[44px] py-2.5 px-3.5 rounded-xl border border-[#1c2e42] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Voltar ao Pátio</span>
          </button>
          
          <PitTrackLogo
            size="sm"
            showSubtitle={false}
            logoUrl={currentOficina.logo_url}
            corPrimaria={brandColor}
            nomeOficina={currentOficina.nome}
          />
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-lg mx-auto w-full px-4 pt-4 flex-1">
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/40 text-rose-300 px-3.5 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Identificação da Oficina Autenticada */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold flex-shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block">
                  Oficina Responsável
                </span>
                <span className="text-xs font-extrabold text-white truncate block">
                  {currentOficina.nome}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-lg flex-shrink-0">
              Ativa
            </span>
          </div>

          {/* Dados do Veículo */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2.5">
              <Car className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Dados do Veículo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Placa Mercosul com Máscara Automática */}
              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1.5">
                  Placa (Mercosul / Antiga) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: BRA2E19 ou ABC-1234"
                  maxLength={8}
                  value={veiculoPlaca}
                  onChange={(e) => setVeiculoPlaca(maskPlaca(e.target.value))}
                  required
                  className="w-full min-h-[48px] bg-[#080d14] border border-[#1c2e42] uppercase font-mono font-bold text-base sm:text-sm text-white rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-[#5c7287]"
                />
              </div>

              {/* KM Atual com Máscara Automática */}
              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1.5">
                  KM Atual
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 48.500"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(maskKM(e.target.value))}
                  className="w-full min-h-[48px] bg-[#080d14] border border-[#1c2e42] font-mono text-base sm:text-sm text-white rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>
            </div>

            {/* Modelo do Veículo */}
            <div>
              <label className="text-[11px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1.5">
                Modelo e Versão *
              </label>
              <input
                type="text"
                placeholder="Ex: Toyota Corolla 2.0 ou Honda Civic EXL"
                value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                required
                className="w-full min-h-[48px] bg-[#080d14] border border-[#1c2e42] text-base sm:text-sm font-semibold text-white rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
              />
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2.5">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Dados do Cliente (WhatsApp)
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo Ferreira"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                  className="w-full min-h-[48px] bg-[#080d14] border border-[#1c2e42] text-base sm:text-sm font-semibold text-white rounded-xl px-3.5 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1.5">
                  WhatsApp com DDD (com máscara automática) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5c7287]">
                    BR
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(11) 99123-4567"
                    maxLength={15}
                    value={clienteWhatsapp}
                    onChange={(e) => setClienteWhatsapp(maskPhone(e.target.value))}
                    required
                    className="w-full min-h-[48px] bg-[#080d14] border border-[#1c2e42] text-base sm:text-sm font-mono font-semibold text-white rounded-xl pl-11 pr-3.5 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload de Fotos de Entrada */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#182738] pb-2.5 gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Fotos de Check-in na Oficina</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex-shrink-0">
                WebP Otimizado p/ 4G
              </span>
            </div>

            {/* Grid de Fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#1c2e42] bg-[#080d14] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Entrada ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label={`Remover foto ${idx + 1}`}
                      className="absolute top-1.5 right-1.5 bg-rose-600/95 hover:bg-rose-500 text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full shadow-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de Upload com Área de Toque Ampliada */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[52px] border-2 border-dashed border-[#1c2e42] hover:border-emerald-500/60 bg-[#080d14] hover:bg-[#0c1521] transition-all rounded-xl py-3.5 px-4 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-slate-200 active:scale-98 cursor-pointer"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Comprimindo em WebP e enviando...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <span>Tirar Foto ou Carregar da Galeria</span>
                </>
              )}
            </button>
          </div>

          {/* Adição Dinâmica de Itens (Services e Parts) */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#182738] pb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Peças & Serviços Técnicos</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {/* Sugestões Rápidas do Catálogo da Oficina (Touch-Friendly Pills) */}
            <div>
              <span className="text-[11px] uppercase font-bold text-[#8b9eb0] mb-2 block">
                Catálogo Rápido da Oficina (Toque p/ Adicionar):
              </span>
              <div className="flex flex-wrap gap-2">
                {catalogoOficina.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSugestao(sug)}
                    className="min-h-[40px] text-xs bg-[#080d14] border border-[#1c2e42] hover:border-emerald-500/50 text-slate-200 hover:text-white px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer text-left"
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" style={{ color: brandColor }} />
                    <span className="line-clamp-1">{sug.descricao}</span>
                    <span className="font-bold font-mono flex-shrink-0" style={{ color: brandColor }}>
                      R${sug.valor}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Adição de Item Mobile-First */}
            <div className="bg-[#080d14] border border-[#1c2e42] p-3.5 rounded-2xl space-y-3">
              <div className="grid grid-cols-2 gap-1.5 bg-[#0e1724] p-1.5 rounded-xl border border-[#1c2e42]">
                <button
                  type="button"
                  onClick={() => setNovoTipo('PECA')}
                  style={novoTipo === 'PECA' ? { backgroundColor: brandColor } : undefined}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoTipo === 'PECA'
                      ? 'text-slate-950 shadow-sm'
                      : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Peça</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNovoTipo('MAO_DE_OBRA')}
                  style={novoTipo === 'MAO_DE_OBRA' ? { backgroundColor: brandColor } : undefined}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoTipo === 'MAO_DE_OBRA'
                      ? 'text-slate-950 shadow-sm'
                      : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>Serviço Técnico</span>
                </button>
              </div>

              {/* Empilhado no celular (< sm) e lado a lado em telas maiores (sm:grid-cols-3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Descrição da peça ou serviço..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="sm:col-span-2 min-h-[48px] bg-[#0e1724] border border-[#1c2e42] text-base sm:text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 placeholder:text-[#5c7287]"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="R$ Valor (ex: 150)"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="min-h-[48px] bg-[#0e1724] border border-[#1c2e42] text-base sm:text-xs font-mono font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="w-full min-h-[48px] bg-[#122030] hover:bg-[#16273b] active:scale-98 text-emerald-400 font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl border border-[#1e344d] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Adicionar Peça / Serviço ao Orçamento</span>
              </button>
            </div>

            {/* Lista Empilhada de Cards de Itens (Sem quebra horizontal no celular) */}
            <div className="space-y-2 pt-1">
              {itens.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-[#080d14] border border-[#1c2e42] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <span
                      style={{
                        backgroundColor: `${brandColor}18`,
                        color: brandColor,
                        borderColor: `${brandColor}35`,
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 mt-0.5 sm:mt-0"
                    >
                      {it.tipo === 'PECA' ? 'Peça' : 'Serviço Técnico'}
                    </span>
                    <span className="text-slate-100 font-medium break-words leading-snug">
                      {it.descricao}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#142232] flex-shrink-0 font-mono">
                    <span className="font-extrabold text-sm text-white">
                      R$ {Number(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      aria-label={`Remover ${it.descricao}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo de Subtotais (Peças vs Serviços Técnicos) + Totalizador */}
            <div className="bg-[#091018] rounded-2xl p-3.5 border border-[#1c2e42] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8b9eb0]">
                <span>Subtotal Peças e Insumos:</span>
                <span className="font-mono font-bold text-slate-200">
                  R$ {subtotalPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8b9eb0]">
                <span>Subtotal Serviços Técnicos:</span>
                <span className="font-mono font-bold text-slate-200">
                  R$ {subtotalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-[#182738] flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-[#8b9eb0] tracking-wider">
                  Valor Total Estimado
                </span>
                <span style={{ color: brandColor }} className="text-xl font-black font-mono">
                  R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Botão Principal de Ação (Touch Target >= 56px) */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: brandColor }}
            className="w-full min-h-[56px] flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-98 disabled:opacity-50 text-slate-950 font-black text-sm sm:text-base py-4 px-5 rounded-2xl shadow-xl transition-all uppercase tracking-wide cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Gerando Orçamento e Link...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Salvar e Enviar p/ Cliente</span>
              </>
            )}
          </button>
        </form>

        {/* Modal de Sucesso Pós-Criação */}
        {createdOSData && (
          <div className="fixed inset-0 z-50 bg-[#080d14]/95 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Ordem de Serviço Criada!</h3>
              <p className="text-xs text-[#8b9eb0]">
                A OS <strong className="text-emerald-400 font-mono">{createdOSData.codigo_curto}</strong> foi gravada com sucesso.
              </p>

              <div className="space-y-2 pt-2">
                <a
                  href={createdOSData.whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all uppercase tracking-wide cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Abrir / Enviar no WhatsApp</span>
                </a>

                <a
                  href={`/os/${createdOSData.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#122030] hover:bg-[#16273b] text-white font-bold text-xs py-2.5 rounded-xl border border-[#1e344d] transition-all cursor-pointer"
                >
                  <span>Visualizar Página do Cliente</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedOSData(null);
                    setVeiculoPlaca('');
                    setVeiculoModelo('');
                    setKmAtual('');
                    setClienteNome('');
                    setClienteWhatsapp('');
                    setFotos([]);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-bold py-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Cadastrar Outro Veículo</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-1.5 text-[#8b9eb0] hover:text-white text-xs py-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao Pátio</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
