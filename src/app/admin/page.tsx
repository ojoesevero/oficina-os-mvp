'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  Plus,
  Wrench,
  Package,
  Palette,
  Camera,
  Trash2,
  X,
  ExternalLink,
  LogOut,
  Lock,
  Mail,
  Phone,
  FileText,
  Power,
  Loader2,
  Sparkles,
  KeyRound,
  Search,
  DollarSign,
} from 'lucide-react';
import { Oficina, OrdemServico, PlanoSaaS, ServicoCatalogo, TipoItem } from '@/types/database';
import {
  fetchOficinas,
  fetchOrdensServico,
  saveOficinaAdmin,
  updateServicosOficinaAdmin,
  updateOficinaBranding,
  deleteOficinaAdmin,
  uploadFotoOS,
} from '@/lib/osService';
import {
  isSuperAdminAuthenticated,
  loginSuperAdmin,
  logoutSuperAdmin,
  getMasterAdminCredentials,
  updateMasterAdminCredentials,
  setCurrentOficina,
  useIsHydrated,
} from '@/lib/authService';
import PitTrackLogo from '@/components/PitTrackLogo';

const CORES_PRESETS = [
  { nome: 'Verde Esmeralda', hex: '#22c55e' },
  { nome: 'Âmbar Industrial', hex: '#f59e0b' },
  { nome: 'Azul Ciano', hex: '#06b6d4' },
  { nome: 'Azul Royal', hex: '#3b82f6' },
  { nome: 'Roxo Performance', hex: '#a855f7' },
  { nome: 'Vermelho Racing', hex: '#f43f5e' },
];

const PLANO_VALORES: Record<PlanoSaaS, { label: string; valor: number }> = {
  ESSENCIAL: { label: 'Essencial (R$ 97/mês)', valor: 97 },
  PRO: { label: 'Pro (R$ 197/mês)', valor: 197 },
  MULTI: { label: 'Multi-Pátio (R$ 297/mês)', valor: 297 },
};

export default function SuperAdminPage() {
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estado de Autenticação Super Admin
  const [authVersion, setAuthVersion] = useState(0);
  const isAdminLogged = isHydrated && authVersion >= 0 && isSuperAdminAuthenticated();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dados gerais do Backoffice SaaS
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [todasOrdens, setTodasOrdens] = useState<OrdemServico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal 1: Cadastrar / Editar Oficina + Upload de Logo + Cor Padrão
  const [isOficinaModalOpen, setIsOficinaModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formCnpjCpf, setFormCnpjCpf] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formPlano, setFormPlano] = useState<PlanoSaaS>('PRO');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formCor, setFormCor] = useState('#22c55e');
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingOficina, setIsSavingOficina] = useState(false);

  // Modal 2: Gerenciar Catálogo de Serviços Técnicos e Peças da Oficina
  const [catalogOficina, setCatalogOficina] = useState<Oficina | null>(null);
  const [catalogItens, setCatalogItens] = useState<ServicoCatalogo[]>([]);
  const [novoServTipo, setNovoServTipo] = useState<TipoItem>('MAO_DE_OBRA');
  const [novoServDesc, setNovoServDesc] = useState('');
  const [novoServValor, setNovoServValor] = useState('');
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Modal 3: Configurações de Segurança do Super Admin
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPass, setMasterPass] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const carregarDadosAdmin = async () => {
    setIsLoading(true);
    try {
      const [listaOficinas, listaOrdens] = await Promise.all([
        fetchOficinas(),
        fetchOrdensServico(),
      ]);
      setOficinas(listaOficinas);
      setTodasOrdens(listaOrdens);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminLogged) return;
    let active = true;
    Promise.all([fetchOficinas(), fetchOrdensServico()]).then(([listaOficinas, listaOrdens]) => {
      if (active) {
        setOficinas(listaOficinas);
        setTodasOrdens(listaOrdens);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [isAdminLogged]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const ok = loginSuperAdmin(loginEmail, loginPass);
    if (ok) {
      setAuthVersion((v) => v + 1);
    } else {
      setLoginError('Credenciais de Administrador Master inválidas.');
    }
  };

  const handleAdminLogout = () => {
    logoutSuperAdmin();
    setAuthVersion((v) => v + 1);
    setLoginPass('');
  };

  // Abrir modal para Nova Oficina
  const handleOpenNovaOficina = () => {
    setEditingId(undefined);
    setFormNome('');
    setFormEmail('');
    setFormSenha('');
    setFormWhatsapp('');
    setFormCnpjCpf('');
    setFormEndereco('');
    setFormPlano('PRO');
    setFormAtivo(true);
    setFormCor('#22c55e');
    setFormLogoUrl(null);
    setIsOficinaModalOpen(true);
  };

  // Abrir modal para Editar Oficina existente (Dados, Logo, Cor, Senha)
  const handleOpenEditarOficina = (of: Oficina) => {
    setEditingId(of.id);
    setFormNome(of.nome);
    setFormEmail(of.email || '');
    setFormSenha(of.senha_acesso || '');
    setFormWhatsapp(of.whatsapp || '');
    setFormCnpjCpf(of.cnpj_cpf || '');
    setFormEndereco(of.endereco || '');
    setFormPlano(of.plano || 'PRO');
    setFormAtivo(of.ativo !== false);
    setFormCor(of.cor_primaria || '#22c55e');
    setFormLogoUrl(of.logo_url || null);
    setIsOficinaModalOpen(true);
  };

  // Upload de Logotipo com compressão WebP automática
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadFotoOS(file);
      setFormLogoUrl(url);
      showToast('Logotipo otimizado em WebP com sucesso!');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Salvar Oficina (Cadastro ou Edição)
  const handleSaveOficina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim() || !formWhatsapp.trim()) return;

    setIsSavingOficina(true);
    try {
      const saved = await saveOficinaAdmin({
        id: editingId,
        nome: formNome,
        email: formEmail,
        senha_acesso: formSenha.trim() || undefined,
        whatsapp: formWhatsapp,
        cnpj_cpf: formCnpjCpf,
        endereco: formEndereco,
        plano: formPlano,
        ativo: formAtivo,
        cor_primaria: formCor,
        logo_url: formLogoUrl,
      });

      await carregarDadosAdmin();
      setIsOficinaModalOpen(false);
      showToast(
        editingId
          ? `Oficina "${saved.nome}" atualizada com sucesso!`
          : `Nova oficina "${saved.nome}" cadastrada com sucesso!`
      );
    } finally {
      setIsSavingOficina(false);
    }
  };

  // Alternar Status Ativo / Suspenso com 1 clique
  const handleToggleAtivo = async (of: Oficina) => {
    const novoStatus = of.ativo === false ? true : false;
    await updateOficinaBranding(of.id, { ativo: novoStatus });
    await carregarDadosAdmin();
    showToast(
      novoStatus
        ? `Acesso da oficina "${of.nome}" foi REATIVADO.`
        : `Acesso da oficina "${of.nome}" foi SUSPENSO.`
    );
  };

  // Excluir oficina de teste
  const handleDeleteOficina = async (of: Oficina) => {
    if (!confirm(`Tem certeza que deseja remover a oficina "${of.nome}"?`)) return;
    await deleteOficinaAdmin(of.id);
    await carregarDadosAdmin();
    showToast(`Oficina "${of.nome}" removida.`);
  };

  // Acessar o Pátio como a oficina (Suporte / Demonstração do Administrador)
  const handleAcessarPatioOficina = (of: Oficina) => {
    setCurrentOficina(of);
    router.push('/');
  };

  // Abrir modal de Catálogo de Serviços Técnicos e Peças da Oficina
  const handleOpenCatalogModal = (of: Oficina) => {
    setCatalogOficina(of);
    setCatalogItens(of.servicos_rapidos ? [...of.servicos_rapidos] : []);
    setNovoServTipo('MAO_DE_OBRA');
    setNovoServDesc('');
    setNovoServValor('');
  };

  const handleAddServicoCatalogo = () => {
    if (!novoServDesc.trim() || !novoServValor) return;
    const valorNum = Number(String(novoServValor).replace(',', '.'));
    if (isNaN(valorNum) || valorNum < 0) return;

    const descricaoFormatada =
      novoServTipo === 'MAO_DE_OBRA' &&
      !novoServDesc.toLowerCase().startsWith('serviço técnico')
        ? `Serviço Técnico: ${novoServDesc.trim()}`
        : novoServDesc.trim();

    setCatalogItens((prev) => [
      ...prev,
      {
        tipo: novoServTipo,
        descricao: descricaoFormatada,
        valor: valorNum,
      },
    ]);
    setNovoServDesc('');
    setNovoServValor('');
  };

  const handleRemoveServicoCatalogo = (index: number) => {
    setCatalogItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCatalogoOficina = async () => {
    if (!catalogOficina) return;
    setIsSavingCatalog(true);
    try {
      await updateServicosOficinaAdmin(catalogOficina.id, catalogItens);
      await carregarDadosAdmin();
      showToast(`Catálogo de serviços de "${catalogOficina.nome}" atualizado!`);
      setCatalogOficina(null);
    } finally {
      setIsSavingCatalog(false);
    }
  };

  // Abrir Modal de Credenciais do Super Admin
  const handleOpenSecurityModal = () => {
    const creds = getMasterAdminCredentials();
    setMasterEmail(creds.email);
    setMasterPass(creds.pass);
    setIsSecurityModalOpen(true);
  };

  const handleSaveMasterCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterEmail.trim() || masterPass.length < 6) return;
    updateMasterAdminCredentials(masterEmail, masterPass);
    setIsSecurityModalOpen(false);
    showToast('Credenciais Master do Administrador atualizadas!');
  };

  if (!isHydrated) {
    return null;
  }

  // ============================================================================
  // TELA DE LOGIN EXCLUSIVA DO ADMINISTRADOR MASTER (JONATAN SEVERO TECH)
  // ============================================================================
  if (!isAdminLogged) {
    return (
      <div className="min-h-screen bg-[#060a10] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#0d1520] border border-[#1e2f42] rounded-3xl p-7 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Acesso Restrito • Proprietário SaaS
            </span>
            <h1 className="text-xl font-black text-white">
              Painel Administrador Master
            </h1>
            <p className="text-xs text-[#8b9eb0]">
              Jonatan Severo Tech • Gestão de Oficinas, Serviços e Logotipos
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                E-mail Master
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@jonatanseverotech.com"
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                Senha Master
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg cursor-pointer transition-all"
            >
              Entrar no Painel Master
            </button>
          </form>

          <div className="pt-3 border-t border-[#182636] flex items-center justify-between text-[11px] text-[#6d8296]">
            <span>Padrão inicial: admin@jonatanseverotech.com</span>
            <Link href="/login" className="text-emerald-400 hover:underline font-bold">
              Ir p/ Login Cliente →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cálculos de KPIs do SaaS
  const oficinasAtivas = oficinas.filter((o) => o.ativo !== false);
  const mrrEstimado = oficinasAtivas.reduce((acc, of) => {
    const plano = of.plano || 'PRO';
    return acc + (PLANO_VALORES[plano]?.valor || 197);
  }, 0);

  const oficinasFiltradas = oficinas.filter((of) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      of.nome.toLowerCase().includes(q) ||
      (of.email || '').toLowerCase().includes(q) ||
      (of.cnpj_cpf || '').toLowerCase().includes(q)
    );
  });

  // ============================================================================
  // PAINEL SUPER ADMIN LOGADO
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#060a10] text-slate-100 pb-20">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Topbar Exclusiva Jonatan Severo Tech */}
      <header className="sticky top-0 z-30 bg-[#0b121c]/95 backdrop-blur-md border-b border-[#1c2e42] px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight">
                  Jonatan Severo Tech • Admin Master
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#8b9eb0]">
                Central de Cadastro de Oficinas, Catálogo de Serviços, Logos e Manutenção SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenSecurityModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111c2b] hover:bg-[#17263b] border border-[#1f334a] text-xs font-bold text-slate-200 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Senha Master</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNovaOficina}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Oficina</span>
            </button>

            <button
              type="button"
              onClick={handleAdminLogout}
              title="Sair do Painel Admin"
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* KPIs Executivos da Plataforma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0d1622] border border-[#1c2e42] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b9eb0]">
                Oficinas Cadastradas
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {oficinasAtivas.length}{' '}
                <span className="text-xs font-medium text-[#8b9eb0]">
                  ativas de {oficinas.length}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0d1622] border border-[#1c2e42] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b9eb0]">
                Receita Recorrente (MRR)
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                R$ {mrrEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0d1622] border border-[#1c2e42] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8b9eb0]">
                Total de OS Geradas
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {todasOrdens.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Barra de Busca e Filtro de Oficinas */}
        <div className="bg-[#0d1622] border border-[#1c2e42] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-[#5c7287] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar oficina por nome, e-mail ou CNPJ..."
              className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-xs text-[#8b9eb0]">
            Gerencie individualmente o <strong className="text-white">Logotipo</strong>,{' '}
            <strong className="text-white">Cor Padrão</strong> e{' '}
            <strong className="text-white">Catálogo de Serviços Técnicos</strong> de cada cliente.
          </div>
        </div>

        {/* Lista de Oficinas Cadastradas */}
        {isLoading ? (
          <div className="bg-[#0d1622] border border-[#1c2e42] rounded-3xl p-12 text-center">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#8b9eb0]">Carregando oficinas da plataforma...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {oficinasFiltradas.map((of) => {
              const cor = of.cor_primaria || '#22c55e';
              const qtdOS = todasOrdens.filter((o) => o.oficina_id === of.id).length;
              const qtdServicos = of.servicos_rapidos?.length || 0;
              const isAtiva = of.ativo !== false;

              return (
                <div
                  key={of.id}
                  className={`bg-[#0d1622] border rounded-3xl p-5 transition-all ${
                    isAtiva ? 'border-[#1c2e42]' : 'border-rose-500/30 opacity-75'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Identidade Visual + Dados da Oficina */}
                    <div className="flex items-start sm:items-center gap-4">
                      <PitTrackLogo
                        size="md"
                        logoUrl={of.logo_url}
                        corPrimaria={cor}
                        nomeOficina={of.nome}
                        showSubtitle={false}
                      />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                              isAtiva
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isAtiva ? '● Ativa' : '● Suspensa'}
                          </span>

                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#142234] text-slate-300 border border-[#223854]">
                            Plano {of.plano || 'PRO'}
                          </span>

                          <span className="text-[11px] text-[#8b9eb0] font-mono">
                            {qtdOS} OS • {qtdServicos} serviços no catálogo
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8b9eb0] pt-1">
                          <span className="flex items-center gap-1 text-slate-300 font-mono">
                            <Mail className="w-3.5 h-3.5 text-emerald-400" />
                            {of.email || 'Sem e-mail'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            {of.whatsapp}
                          </span>
                          {of.cnpj_cpf && (
                            <span className="text-[#6d8296]">CNPJ/CPF: {of.cnpj_cpf}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Manutenção Exclusivos do Administrador */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#182738]">
                      {/* 1. Editar Cadastro / Upload de Logo / Cor */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditarOficina(of)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#132030] hover:bg-[#1b2d42] border border-[#213752] text-xs font-bold text-white cursor-pointer"
                      >
                        <Palette className="w-3.5 h-3.5" style={{ color: cor }} />
                        <span>Editar / Logo & Cor</span>
                      </button>

                      {/* 2. Cadastrar Serviços Técnicos e Peças */}
                      <button
                        type="button"
                        onClick={() => handleOpenCatalogModal(of)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#132030] hover:bg-[#1b2d42] border border-[#213752] text-xs font-bold text-emerald-400 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Cadastrar Serviços ({qtdServicos})</span>
                      </button>

                      {/* 3. Acessar Pátio da Oficina (Impersonation p/ Suporte) */}
                      <button
                        type="button"
                        onClick={() => handleAcessarPatioOficina(of)}
                        style={{ backgroundColor: `${cor}20`, color: cor, borderColor: `${cor}40` }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Pátio</span>
                      </button>

                      {/* 4. Suspender / Ativar Oficina */}
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(of)}
                        title={isAtiva ? 'Suspender Acesso da Oficina' : 'Reativar Oficina'}
                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          isAtiva
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      {/* 5. Excluir Oficina */}
                      <button
                        type="button"
                        onClick={() => handleDeleteOficina(of)}
                        title="Excluir Oficina"
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL 1: CADASTRAR / EDITAR OFICINA + UPLOAD DE LOGO + COR PADRÃO
      ========================================================================= */}
      {isOficinaModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#060a10]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#182738] pb-3">
              <div>
                <h2 className="text-base font-black text-white">
                  {editingId ? 'Editar Oficina & Identidade Visual' : 'Cadastrar Nova Oficina Cliente'}
                </h2>
                <p className="text-xs text-[#8b9eb0]">
                  Configure os dados de acesso, logotipo individual e cor padrão da oficina
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOficinaModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#080d14] text-slate-400 hover:text-white border border-[#1c2e42] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview em Tempo Real do Topo da Oficina */}
            <div className="bg-[#080d14] border border-[#1c2e42] rounded-2xl p-4 flex items-center justify-between">
              <PitTrackLogo
                size="md"
                logoUrl={formLogoUrl}
                corPrimaria={formCor}
                nomeOficina={formNome || 'Nome da Oficina Cliente'}
              />
              <span
                style={{
                  backgroundColor: `${formCor}20`,
                  color: formCor,
                  borderColor: `${formCor}40`,
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
              >
                Preview ao Vivo
              </span>
            </div>

            <form onSubmit={handleSaveOficina} className="space-y-4">
              {/* Dados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    Nome da Oficina *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: AutoCenter Silva & Filhos"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    E-mail de Login da Oficina *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contato@oficinasilva.com"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    Senha de Acesso da Oficina
                  </label>
                  <input
                    type="text"
                    value={formSenha}
                    onChange={(e) => setFormSenha(e.target.value)}
                    placeholder="Ex: Silva@2026 (mín. 6 dígitos)"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    WhatsApp da Oficina (com DDD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="5511999998888"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={formCnpjCpf}
                    onChange={(e) => setFormCnpjCpf(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    Endereço Comercial
                  </label>
                  <input
                    type="text"
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    placeholder="Av. Brasil, 1000 - Centro"
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    Plano SaaS Contratado
                  </label>
                  <select
                    value={formPlano}
                    onChange={(e) => setFormPlano(e.target.value as PlanoSaaS)}
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="ESSENCIAL">Essencial (R$ 97/mês)</option>
                    <option value="PRO">Pro (R$ 197/mês)</option>
                    <option value="MULTI">Multi-Pátio (R$ 297/mês)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                    Status da Conta
                  </label>
                  <select
                    value={formAtivo ? 'ATIVO' : 'SUSPENSO'}
                    onChange={(e) => setFormAtivo(e.target.value === 'ATIVO')}
                    className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="ATIVO">● Conta Ativa (Liberada)</option>
                    <option value="SUSPENSO">● Conta Suspensa (Bloqueada)</option>
                  </select>
                </div>
              </div>

              {/* Upload de Logotipo Individual */}
              <div className="space-y-2 pt-2 border-t border-[#182738]">
                <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block">
                  Logotipo Individual da Oficina (WebP Automático)
                </label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 bg-[#080d14] hover:bg-[#111e2e] border border-dashed border-[#1c2e42] rounded-xl py-2.5 px-3 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: formCor }} />
                        <span>Comprimindo e Enviando Logo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" style={{ color: formCor }} />
                        <span>Selecionar Imagem de Logotipo</span>
                      </>
                    )}
                  </button>
                  {formLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormLogoUrl(null)}
                      className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold cursor-pointer"
                    >
                      Remover Logo
                    </button>
                  )}
                </div>
              </div>

              {/* Cor Padrão da Oficina */}
              <div className="space-y-2 pt-2 border-t border-[#182738]">
                <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block">
                  Cor Padrão da Oficina
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CORES_PRESETS.map((preset) => {
                    const selected = formCor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setFormCor(preset.hex)}
                        style={
                          selected
                            ? { borderColor: preset.hex, backgroundColor: `${preset.hex}18` }
                            : undefined
                        }
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                          selected ? 'border-2' : 'border-[#1c2e42] bg-[#080d14]'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: preset.hex }}
                          className="w-4 h-4 rounded-full flex-shrink-0"
                        />
                        <span className="text-[11px] font-bold text-slate-200 truncate">
                          {preset.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={formCor}
                    onChange={(e) => setFormCor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-[#080d14] border border-[#1c2e42] cursor-pointer"
                  />
                  <span className="text-xs text-[#8b9eb0] font-mono">
                    Código Hexadecimal: <strong className="text-white">{formCor}</strong>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingOficina}
                style={{ backgroundColor: formCor }}
                className="w-full hover:opacity-90 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg cursor-pointer mt-2"
              >
                {isSavingOficina
                  ? 'Salvando Oficina...'
                  : editingId
                  ? 'Salvar Alterações da Oficina'
                  : 'Concluir Cadastro da Oficina'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CADASTRAR SERVIÇOS TÉCNICOS E PEÇAS DA OFICINA
      ========================================================================= */}
      {catalogOficina && (
        <div className="fixed inset-0 z-50 bg-[#060a10]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#182738] pb-3">
              <div>
                <h2 className="text-base font-black text-white">
                  Catálogo de Serviços Técnicos e Peças
                </h2>
                <p className="text-xs text-[#8b9eb0]">
                  Oficina: <strong className="text-white">{catalogOficina.nome}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatalogOficina(null)}
                className="p-1.5 rounded-xl bg-[#080d14] text-slate-400 hover:text-white border border-[#1c2e42] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Adicionar Novo Serviço ou Peça ao Catálogo da Oficina */}
            <div className="bg-[#080d14] border border-[#1c2e42] rounded-2xl p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Cadastrar Novo Item no Catálogo Rápido desta Oficina
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNovoServTipo('MAO_DE_OBRA')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    novoServTipo === 'MAO_DE_OBRA'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-[#0e1724] border-[#1c2e42] text-slate-400'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Serviço Técnico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNovoServTipo('PECA')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    novoServTipo === 'PECA'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#0e1724] border-[#1c2e42] text-slate-400'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Peça / Insumo</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={novoServDesc}
                  onChange={(e) => setNovoServDesc(e.target.value)}
                  placeholder={
                    novoServTipo === 'MAO_DE_OBRA'
                      ? 'Ex: Alinhamento 3D + Balanceamento'
                      : 'Ex: Jogo de Pastilhas Dianteiras'
                  }
                  className="flex-1 bg-[#0e1724] border border-[#1c2e42] rounded-xl px-3 py-2.5 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  value={novoServValor}
                  onChange={(e) => setNovoServValor(e.target.value)}
                  placeholder="Valor R$"
                  className="w-full sm:w-28 bg-[#0e1724] border border-[#1c2e42] rounded-xl px-3 py-2.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddServicoCatalogo}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Incluir
                </button>
              </div>
            </div>

            {/* Lista de Serviços e Peças Cadastrados na Oficina */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {catalogItens.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8b9eb0]">
                  Nenhum serviço ou peça cadastrado. Adicione acima!
                </div>
              ) : (
                catalogItens.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#080d14] border border-[#182738] rounded-xl px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          item.tipo === 'PECA'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-sky-500/15 text-sky-400'
                        }`}
                      >
                        {item.tipo === 'PECA' ? 'Peça' : 'Serviço Técnico'}
                      </span>
                      <span className="text-slate-200 truncate">{item.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="font-bold text-white">
                        R$ {Number(item.valor).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveServicoCatalogo(idx)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              disabled={isSavingCatalog}
              onClick={handleSaveCatalogoOficina}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg cursor-pointer"
            >
              {isSavingCatalog
                ? 'Salvando Catálogo...'
                : 'Salvar Catálogo de Serviços da Oficina'}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CREDENCIAIS MASTER DO SUPER ADMIN (JONATAN SEVERO TECH)
      ========================================================================= */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#060a10]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#182738] pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  Credenciais do Administrador Master
                </h3>
                <p className="text-xs text-[#8b9eb0]">
                  Exclusivo Jonatan Severo Tech (/admin)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#080d14] text-slate-400 hover:text-white border border-[#1c2e42] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterCredentials} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                  Seu E-mail Master
                </label>
                <input
                  type="email"
                  required
                  value={masterEmail}
                  onChange={(e) => setMasterEmail(e.target.value)}
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8b9eb0] block mb-1">
                  Sua Senha Master (mínimo 6 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={masterPass}
                  onChange={(e) => setMasterPass(e.target.value)}
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl cursor-pointer"
              >
                Atualizar Senha Master
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
