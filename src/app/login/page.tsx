'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2
} from 'lucide-react';
import { 
  loginOficina, 
  getCurrentOficina 
} from '@/lib/authService';
import PitTrackLogo from '@/components/PitTrackLogo';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080d14] flex items-center justify-center text-[#8b9eb0]">
          Carregando acesso...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const active = getCurrentOficina();
    if (active) {
      router.replace(returnTo);
    }
  }, [router, returnTo]);

  const handleLogin = async (targetEmail = email, targetSenha = senha) => {
    setErrorMsg('');
    if (!targetEmail.trim()) {
      setErrorMsg('Informe o e-mail da oficina.');
      return;
    }
    if (!targetSenha) {
      setErrorMsg('Informe a senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginOficina(targetEmail, targetSenha);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.replace(returnTo);
        }, 500);
      } else {
        setErrorMsg(res.error || 'Falha ao autenticar.');
      }
    } catch {
      setErrorMsg('Erro inesperado de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex flex-col justify-center px-4 py-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Topo Logo e Posicionamento Unificado JoeSevero Tech + JS OrçaFácil */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <PitTrackLogo size="lg" />
          <p className="text-xs text-[#8b9eb0] max-w-xs mx-auto leading-relaxed">
            Sistema de gestão de pátio, check-in fotográfico e orçamentos aprovados em 1 clique no WhatsApp.
          </p>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Uma solução JoeSevero Tech
          </span>
        </div>

        {/* Card do Formulário — Exclusivo por Credencial (Sem listar outras oficinas) */}
        <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#182738] pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Acesso Exclusivo da Oficina</span>
            </span>
            <span className="text-[10px] bg-[#080d14] border border-[#1c2e42] text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              Ambiente Blindado
            </span>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>Login efetuado com sucesso! Redirecionando...</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                E-mail Corporativo da Oficina
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5c7287] absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaoficina.com.br"
                  required
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5c7287] absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-98 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando Credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Pátio</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé Informativo de Segurança, LGPD e Fornecedor */}
        <div className="text-center space-y-1.5 text-[#5c7287] text-[11px]">
          <div className="flex items-center justify-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Isolamento Multi-Tenant e proteção de dados em conformidade com a LGPD (Lei nº 13.709/2018).</span>
          </div>
          <p className="text-[10px] text-[#5c7287]">
            JS OrçaFácil • Desenvolvido e fornecido por <strong className="text-slate-300">JoeSevero Tech</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
