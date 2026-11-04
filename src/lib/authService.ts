import { useSyncExternalStore } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Oficina } from '@/types/database';
import { fetchOficinas, logEventoOS } from './osService';

const AUTH_STORAGE_KEY = 'oficina_os_current_auth_v1';

// Permite demonstração e troca rápida de oficinas
export const isDemoModeEnabled =
  process.env.NODE_ENV === 'development' ||
  !isSupabaseConfigured ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'false';

export interface DemoAccount {
  email: string;
  nome: string;
  oficinaId: string;
  corPrimaria: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'lider@oficina.com',
    nome: 'AutoCenter Líder',
    oficinaId: '11111111-1111-1111-1111-111111111111',
    corPrimaria: '#22c55e',
  },
  {
    email: 'alemao@oficina.com',
    nome: 'Mecânica Alemão & Especialistas',
    oficinaId: '22222222-2222-2222-2222-222222222222',
    corPrimaria: '#f59e0b',
  },
  {
    email: 'cartech@oficina.com',
    nome: 'CarTech Performance',
    oficinaId: '33333333-3333-3333-3333-333333333333',
    corPrimaria: '#06b6d4',
  },
];

// Cache em memória para garantir estabilidade referencial com useSyncExternalStore
let cachedOficina: Oficina | null | undefined;
let cachedRaw: string | null = null;

// Recuperar oficina logada atualmente com preservação de referência
export function getCurrentOficina(): Oficina | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw === cachedRaw && cachedOficina !== undefined) {
      return cachedOficina;
    }
    cachedRaw = raw;
    cachedOficina = raw ? (JSON.parse(raw) as Oficina) : null;
    return cachedOficina;
  } catch {
    cachedRaw = null;
    cachedOficina = null;
    return null;
  }
}

// Salvar sessão da oficina
export function setCurrentOficina(oficina: Oficina | null): void {
  if (typeof window === 'undefined') return;
  cachedRaw = null;
  cachedOficina = undefined;
  if (oficina) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(oficina));
    window.dispatchEvent(new CustomEvent('oficina_auth_changed', { detail: oficina }));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('oficina_auth_changed', { detail: null }));
  }
}

// Inscrição em alterações de sessão (suporta abas locais e eventos do navegador)
export function subscribeToAuthChanges(callback: () => void): () => void {
  const handler = () => {
    cachedRaw = null;
    cachedOficina = undefined;
    callback();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('oficina_auth_changed', handler);
    window.addEventListener('storage', handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('oficina_auth_changed', handler);
      window.removeEventListener('storage', handler);
    }
  };
}

// Hook reativo oficial compatível com React 19 / Next.js 16 sem cascading renders
export function useCurrentOficina(): Oficina | null {
  return useSyncExternalStore(
    subscribeToAuthChanges,
    getCurrentOficina,
    () => null
  );
}

// Hook oficial de hidratação sem acoplamento de setState em useEffect
const emptySubscribe = () => () => {};
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Troca rápida entre oficinas na tela inicial ou login
export async function loginDemoOficina(
  demoEmailOrId: string
): Promise<{ success: boolean; oficina?: Oficina; error?: string }> {
  const cleanKey = demoEmailOrId.trim().toLowerCase();
  const matchedDemo = DEMO_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === cleanKey || acc.oficinaId.toLowerCase() === cleanKey
  );

  const allOficinas = await fetchOficinas();
  const oficinaFromList = allOficinas.find(
    (of) =>
      of.id.toLowerCase() === cleanKey ||
      of.email?.toLowerCase() === cleanKey ||
      (matchedDemo && of.id === matchedDemo.oficinaId)
  );

  const oficina: Oficina = oficinaFromList || (matchedDemo ? {
    id: matchedDemo.oficinaId,
    nome: matchedDemo.nome,
    whatsapp: '5511999998888',
    email: matchedDemo.email,
    cor_primaria: matchedDemo.corPrimaria,
    logo_url: null,
  } : allOficinas[0]);

  if (!oficina) {
    return { success: false, error: 'Oficina não localizada.' };
  }

  setCurrentOficina(oficina);
  logEventoOS('INFO', 'troca_oficina_ativa', { oficinaId: oficina.id, cor: oficina.cor_primaria });
  return { success: true, oficina };
}

// Realizar Login Oficial
export async function loginOficina(
  email: string,
  password: string
): Promise<{ success: boolean; oficina?: Oficina; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const allOficinas = await fetchOficinas();
  const foundOficina = allOficinas.find(
    (of) => of.email?.toLowerCase() === cleanEmail
  );

  // Verificar se a oficina foi suspensa no Painel Master Admin
  if (foundOficina && foundOficina.ativo === false) {
    return {
      success: false,
      error: 'Acesso desta oficina está temporariamente suspenso. Entre em contato com a JoeSevero Tech.',
    };
  }

  // 1. Verificar credencial configurada pelo Administrador no Painel Master (/admin)
  if (foundOficina && foundOficina.senha_acesso) {
    if (foundOficina.senha_acesso === password) {
      setCurrentOficina(foundOficina);
      logEventoOS('INFO', 'login_oficina_admin_credencial', { oficinaId: foundOficina.id });
      return { success: true, oficina: foundOficina };
    } else {
      return {
        success: false,
        error: 'Senha incorreta para esta oficina. Verifique suas credenciais.',
      };
    }
  }

  // 2. Autenticação oficial via Supabase Auth quando configurado
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user && foundOficina) {
        setCurrentOficina(foundOficina);
        logEventoOS('INFO', 'login_producao_sucesso', { oficinaId: foundOficina.id });
        return { success: true, oficina: foundOficina };
      }
    } catch (e) {
      logEventoOS('ERROR', 'erro_conexao_supabase_auth', { erro: String(e) });
    }
  }

  // 3. Acesso para oficinas cadastradas sem senha customizada / modo demonstração
  if (foundOficina && password.length >= 6) {
    setCurrentOficina(foundOficina);
    logEventoOS('INFO', 'login_oficina_sucesso', { oficinaId: foundOficina.id });
    return { success: true, oficina: foundOficina };
  }

  if (isDemoModeEnabled) {
    const matchedDemo = DEMO_ACCOUNTS.find((acc) => acc.email === cleanEmail);
    if (matchedDemo && password.length >= 6) {
      return loginDemoOficina(cleanEmail);
    }
  }

  return {
    success: false,
    error: 'Credenciais inválidas. Verifique seu e-mail e senha de acesso.',
  };
}

// ============================================================================
// AUTENTICAÇÃO EXCLUSIVA DO SUPER ADMIN (JOESEVERO TECH — /admin)
// ============================================================================
const ADMIN_AUTH_STORAGE_KEY = 'joesevero_super_admin_session_v1';
const ADMIN_CONFIG_STORAGE_KEY = 'joesevero_super_admin_credentials_v1';

export function getMasterAdminCredentials(): { email: string; pass: string } {
  const defaultEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@joeseverotech.com').toLowerCase();
  const defaultPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  if (typeof window === 'undefined') {
    return { email: defaultEmail, pass: defaultPass };
  }
  try {
    const saved = localStorage.getItem(ADMIN_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.email && parsed.pass) {
        return { email: parsed.email.toLowerCase(), pass: parsed.pass };
      }
    }
  } catch {
    // ignore
  }
  return { email: defaultEmail, pass: defaultPass };
}

export function updateMasterAdminCredentials(email: string, pass: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    ADMIN_CONFIG_STORAGE_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), pass })
  );
}

export function isSuperAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
}

export function loginSuperAdmin(email: string, password: string): boolean {
  const creds = getMasterAdminCredentials();
  if (email.trim().toLowerCase() === creds.email && password === creds.pass) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    }
    logEventoOS('INFO', 'super_admin_login_sucesso', { email: creds.email });
    return true;
  }
  return false;
}

export function logoutSuperAdmin(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  }
}

// Realizar Logout
export async function logoutOficina(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao deslogar do Supabase:', e);
    }
  }
  setCurrentOficina(null);
}
