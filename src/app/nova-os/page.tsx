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
import { uploadFotoOS, createOrdemServico, generateWhatsAppLinkParaCliente } from '@/lib/osService';
import { useCurrentOficina, useIsHydrated } from '@/lib/authService';
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
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Revisão Básica e Troca de Filtros', valor: 150 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Alinhamento 3D + Balanceamento 4 Rodas', valor: 140 },
  { tipo: 'MAO_DE_OBRA' as const, descricao: 'Mão de Obra Freios Dianteiros e Sangria', valor: 220 },
];

export default function NovaOSPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Reativos de Autenticação e Oficina
  const currentOficina = useCurrentOficina();
  const isHydrated = useIsHydrated();

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
    { tipo: 'MAO_DE_OBRA', descricao: 'Mão de Obra de Troca e Check-up 20 Itens', valor: 150 }
  ]);

  // Novo item em edição
  const [novoTipo, setNovoTipo] = useState<'PECA' | 'MAO_DE_OBRA'>('PECA');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');

  // Estado de envio
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOSData, setCreatedOSData] = useState<{ id: string; codigo_curto: string; whatsAppLink: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Verificar sessão da oficina sem setState cascading
  useEffect(() => {
    if (isHydrated && !currentOficina) {
      router.replace('/login?returnTo=/nova-os');
    }
  }, [isHydrated, currentOficina, router]);

  // Calcular valor total dinâmico
  const valorTotal = itens.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);

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

      const result = await createOrdemServico({
        oficina_id: currentOficina.id,
        cliente_nome: clienteNome,
        cliente_whatsapp: cleanPhone,
        veiculo_placa: cleanPlaca,
        veiculo_modelo: veiculoModelo,
        km_atual: cleanKM,
        fotos_entrada: fotos,
        itens: itens.map((it) => ({
          tipo: it.tipo,
          descricao: it.descricao,
          valor: Number(it.valor),
        })),
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
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-[#8b9eb0] hover:text-white bg-[#0e1724] hover:bg-[#152336] active:scale-95 text-xs font-bold py-1.5 px-3 rounded-xl border border-[#1c2e42] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Voltar ao Pátio</span>
          </button>
          
          <PitTrackLogo size="sm" showSubtitle={false} />
        </div>
      </header>

      {/* Main Form Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1">
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/40 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Identificação da Oficina Autenticada */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold flex-shrink-0">
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
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-lg flex-shrink-0">
              Ativa
            </span>
          </div>

          {/* Dados do Veículo */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2">
              <Car className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Dados do Veículo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Placa Mercosul com Máscara Automática */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                  Placa (Mercosul / Antiga) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: BRA2E19 ou ABC-1234"
                  maxLength={8}
                  value={veiculoPlaca}
                  onChange={(e) => setVeiculoPlaca(maskPlaca(e.target.value))}
                  required
                  className="w-full bg-[#080d14] border border-[#1c2e42] uppercase font-mono font-bold text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-[#5c7287]"
                />
              </div>

              {/* KM Atual com Máscara Automática */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                  KM Atual
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 48.500"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(maskKM(e.target.value))}
                  className="w-full bg-[#080d14] border border-[#1c2e42] font-mono text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>
            </div>

            {/* Modelo do Veículo */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                Modelo e Versão *
              </label>
              <input
                type="text"
                placeholder="Ex: Toyota Corolla 2.0 ou Honda Civic EXL"
                value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                required
                className="w-full bg-[#080d14] border border-[#1c2e42] text-sm font-semibold text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
              />
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-[#182738] pb-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Dados do Cliente (WhatsApp)
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo Ferreira"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                  className="w-full bg-[#080d14] border border-[#1c2e42] text-sm font-semibold text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                  WhatsApp com DDD (com máscara automática) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5c7287]">
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
                    className="w-full bg-[#080d14] border border-[#1c2e42] text-sm font-mono font-semibold text-white rounded-xl pl-11 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#5c7287]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload de Fotos de Entrada */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#182738] pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Fotos de Check-in na Oficina</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                WebP Otimizado p/ 4G
              </span>
            </div>

            {/* Grid de Fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-[#1c2e42] bg-[#080d14] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Entrada ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-500 text-white p-1 rounded-full shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de Upload */}
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
              className="w-full border-2 border-dashed border-[#1c2e42] hover:border-emerald-500/60 bg-[#080d14] hover:bg-[#0c1521] transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-98 cursor-pointer"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Comprimindo em WebP e enviando...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>Tirar Foto ou Carregar da Galeria</span>
                </>
              )}
            </button>
          </div>

          {/* Adição Dinâmica de Itens (Services e Parts) */}
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#182738] pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Peças & Serviços</span>
              </span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {/* Sugestões Rápidas */}
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5c7287] mb-1.5 block">
                Atalhos Rápidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES_RAPIDAS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSugestao(sug)}
                    className="text-[10px] bg-[#080d14] border border-[#1c2e42] hover:border-emerald-500/50 text-[#8b9eb0] hover:text-white px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>{sug.descricao}</span>
                    <span className="text-emerald-400 font-bold font-mono">R${sug.valor}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulário de Adição de Item */}
            <div className="bg-[#080d14] border border-[#1c2e42] p-3 rounded-xl space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 bg-[#0e1724] p-1 rounded-xl border border-[#1c2e42]">
                <button
                  type="button"
                  onClick={() => setNovoTipo('PECA')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoTipo === 'PECA'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Peça</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNovoTipo('MAO_DE_OBRA')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    novoTipo === 'MAO_DE_OBRA'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-[#8b9eb0] hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Mão de Obra</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Descrição do item..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="col-span-2 bg-[#0e1724] border border-[#1c2e42] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-[#5c7287]"
                />
                <input
                  type="number"
                  placeholder="R$ Valor"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="bg-[#0e1724] border border-[#1c2e42] text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-[#5c7287]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="w-full bg-[#122030] hover:bg-[#16273b] text-emerald-400 font-bold text-xs py-2 rounded-xl border border-[#1e344d] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Adicionar ao Orçamento</span>
              </button>
            </div>

            {/* Lista dos Itens Já Adicionados */}
            <div className="space-y-1.5 pt-1">
              {itens.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-[#080d14] border border-[#1c2e42] p-2.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                      {it.tipo === 'PECA' ? 'Peça' : 'Serviço'}
                    </span>
                    <span className="text-slate-200 truncate">{it.descricao}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="font-bold text-white">
                      R$ {Number(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-400/80 hover:text-rose-300 p-1 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totalizador Estilo PitTrack */}
            <div className="bg-[#091018] rounded-xl p-3 border border-[#1c2e42] flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold text-[#8b9eb0] tracking-wider">
                Valor Total Estimado
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Botão de Envio (Vibrante Verde Neon) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-98 disabled:opacity-50 text-slate-950 font-black text-sm py-4 px-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all uppercase tracking-wide cursor-pointer"
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
