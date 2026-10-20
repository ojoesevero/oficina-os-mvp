'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Trash2, 
  Wrench, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  Loader2, 
  MessageCircle, 
  Sparkles, 
  AlertCircle,
  UploadCloud,
  X
} from 'lucide-react';
import { Oficina } from '@/types/database';
import { fetchOficinas, uploadFotoOS, createOrdemServico, generateWhatsAppLinkParaCliente } from '@/lib/osService';

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

  // Estados
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [selectedOficinaId, setSelectedOficinaId] = useState<string>('');

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

  useEffect(() => {
    async function loadOficinas() {
      const ofs = await fetchOficinas();
      setOficinas(ofs);
      if (ofs.length > 0) {
        setSelectedOficinaId(ofs[0].id);
      }
    }
    loadOficinas();
  }, []);

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

    if (!selectedOficinaId) {
      setErrorMsg('Selecione uma oficina.');
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
      const result = await createOrdemServico({
        oficina_id: selectedOficinaId,
        cliente_nome: clienteNome,
        cliente_whatsapp: clienteWhatsapp,
        veiculo_placa: veiculoPlaca,
        veiculo_modelo: veiculoModelo,
        km_atual: Number(kmAtual) || 0,
        fotos_entrada: fotos,
        itens: itens.map((it) => ({
          tipo: it.tipo,
          descricao: it.descricao,
          valor: Number(it.valor),
        })),
      });

      const currentOficina = oficinas.find((o) => o.id === selectedOficinaId);
      const publicUrl = `${window.location.origin}/os/${result.id}`;
      const whatsAppLink = generateWhatsAppLinkParaCliente(
        {
          cliente_nome: clienteNome,
          cliente_whatsapp: clienteWhatsapp,
          veiculo_modelo: veiculoModelo,
          veiculo_placa: veiculoPlaca,
          codigo_curto: result.codigo_curto,
          id: result.id,
        },
        currentOficina?.nome || 'Oficina Mecânica',
        publicUrl
      );

      setCreatedOSData({
        id: result.id,
        codigo_curto: result.codigo_curto,
        whatsAppLink,
      });

      // Abre imediatamente o WhatsApp em nova aba
      window.open(whatsAppLink, '_blank');
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar a Ordem de Serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-36">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold py-1 px-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Pátio</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              Nova Ordem de Serviço
            </span>
          </div>
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
          {/* Seletor de Oficina */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Oficina Responsável
            </label>
            <select
              value={selectedOficinaId}
              onChange={(e) => setSelectedOficinaId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {oficinas.map((of) => (
                <option key={of.id} value={of.id}>
                  {of.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Dados do Veículo */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                🚘 Dados do Veículo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Placa Mercosul */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Placa (Mercosul) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: BRA2E19"
                  maxLength={8}
                  value={veiculoPlaca}
                  onChange={(e) => setVeiculoPlaca(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-slate-950 border border-slate-700 uppercase font-mono font-bold text-sm text-amber-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-slate-600"
                />
              </div>

              {/* KM Atual */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  KM Atual
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex: 48500"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 font-mono text-sm text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Modelo do Veículo */}
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Modelo e Versão *
              </label>
              <input
                type="text"
                placeholder="Ex: Honda Civic EXL 2.0 2021"
                value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 text-sm font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                👤 Dados do Cliente (WhatsApp)
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo Ferreira"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-sm font-semibold text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  WhatsApp com DDD (somente números) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    +55
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="11991234567"
                    value={clienteWhatsapp}
                    onChange={(e) => setClienteWhatsapp(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 text-sm font-mono font-semibold text-slate-200 rounded-xl pl-11 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload de Fotos de Entrada (Supabase Storage 'fotos-os') */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                📸 Fotos de Entrada (Check-in)
              </span>
              <span className="text-[10px] text-slate-500">
                Bucket: <strong className="text-slate-400">fotos-os</strong>
              </span>
            </div>

            {/* Grid de Pré-visualização de Fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {fotos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
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

            {/* Botão de Upload da Câmera / Arquivo */}
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
              className="w-full border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950 transition-all rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 active:scale-98"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Enviando foto para o Supabase Storage...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-amber-400" />
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Tirar Foto ou Carregar da Galeria</span>
                </>
              )}
            </button>
          </div>

          {/* Adição Dinâmica de Itens (Peças e Mão de Obra) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                📋 Peças e Mão de Obra
              </span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {/* Sugestões Rápidas de 1 Clique */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">
                Sugestões Rápidas de Oficina:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGESTOES_RAPIDAS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSugestao(sug)}
                    className="text-[10px] bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <span>+</span>
                    <span>{sug.descricao}</span>
                    <span className="text-emerald-400 font-bold font-mono">R${sug.valor}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs para adicionar novo item */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2.5">
              {/* Seletor Tipo: Peça ou Mão de Obra */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setNovoTipo('PECA')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    novoTipo === 'PECA'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Peça / Material</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNovoTipo('MAO_DE_OBRA')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    novoTipo === 'MAO_DE_OBRA'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Mão de Obra</span>
                </button>
              </div>

              {/* Descrição e Valor */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Descrição do item ou serviço..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-400 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lista dos Itens Adicionados */}
            <div className="space-y-2 pt-1">
              {itens.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider flex-shrink-0 ${
                        item.tipo === 'PECA'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.tipo === 'PECA' ? 'Peça' : 'Mão de Obra'}
                    </span>
                    <span className="text-xs text-slate-200 font-medium truncate">
                      {item.descricao}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      R$ {Number(item.valor).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </main>

      {/* Modal / Alerta de Sucesso após Gravar */}
      {createdOSData && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">OS Gravada com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Código gerado: <strong className="text-amber-400 font-mono text-sm">{createdOSData.codigo_curto}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
              A janela do WhatsApp foi aberta com a mensagem e o link público prontos para envio.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href={createdOSData.whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all uppercase tracking-wide"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Reabrir WhatsApp</span>
              </a>

              <Link
                href={`/os/${createdOSData.id}`}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition-all"
              >
                <span>Ver Link do Cliente</span>
              </Link>

              <button
                onClick={() => router.push('/')}
                className="w-full text-slate-400 hover:text-white text-xs py-2"
              >
                Voltar para o Pátio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ação Fixa Inferior Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          {/* Soma Automática do Valor Total */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-400 uppercase font-bold tracking-wider text-[11px]">
              Valor Total do Orçamento:
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Botão de Destaque 'Salvar e Enviar p/ Cliente' */}
          <button
            type="button"
            disabled={isSubmitting || isUploadingPhoto}
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 active:scale-98 disabled:opacity-50 text-slate-950 font-black text-sm py-3.5 px-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all uppercase tracking-wide"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Salvando no Supabase...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 fill-slate-950" />
                <span>Salvar e Enviar p/ Cliente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
