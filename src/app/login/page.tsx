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
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { loginOficina, getCurrentOficina, DEMO_ACCOUNTS } from '@/lib/authService';
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

  const handleQuickDemo = (demoEmail: string, demoSenha: string) => {
    setEmail(demoEmail);
    setSenha(demoSenha);
    handleLogin(demoEmail, demoSenha);
  };

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 flex flex-col justify-center px-4 py-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Topo Logo e Título */}
        <div className="flex flex-col items-center text-center space-y-3">
          <PitTrackLogo size="lg" />
          <p className="text-xs text-[#8b9eb0] max-w-xs mx-auto">
            Painel exclusivo da oficina mecânica para gestão de ordens de serviço e orçamentos via WhatsApp.
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-[#0e1724] border border-[#1c2e42] rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#182738] pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Login da Oficina</span>
            </span>
            <span className="text-[10px] bg-[#080d14] border border-[#1c2e42] text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              Área Restrita
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
                E-mail da Oficina
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5c7287] absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: lider@oficina.com"
                  required
                  className="w-full bg-[#080d14] border border-[#1c2e42] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#5c7287] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] block mb-1">
                Senha
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
                  <span>Acessando Oficina...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Pátio</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Atalhos de Demonstração (1 Clique) */}
          <div className="pt-3 border-t border-[#182738] space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8b9eb0] flex items-center justify-between">
              <span>Acesso Rápido de Teste (1 Clique)</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </span>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleQuickDemo(demo.email, demo.senhaPadrao)}
                  className="text-left bg-[#080d14] hover:bg-[#121f2f] border border-[#1c2e42] hover:border-emerald-500/50 p-2.5 rounded-xl transition-all group flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {demo.nome}
                    </div>
                    <div className="text-[10px] text-[#8b9eb0] font-mono">
                      {demo.email}
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                    Entrar
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Informativo de Segurança */}
        <div className="text-center space-y-1 text-[#5c7287] text-[11px] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Isolamento total: seus dados e clientes nunca são expostos publicamente.</span>
        </div>
      </div>
    </div>
  );
}
