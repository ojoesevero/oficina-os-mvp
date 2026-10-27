import { useSyncExternalStore } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { Oficina } from '@/types/database';
import { fetchOficinas } from './osService';

const AUTH_STORAGE_KEY = 'oficina_os_current_auth_v1';

export interface DemoAccount {
  email: string;
  nome: string;
  senhaPadrao: string;
  oficinaId: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'lider@oficina.com',
    nome: 'AutoCenter Líder',
    senhaPadrao: '123456',
    oficinaId: '11111111-1111-1111-1111-111111111111',
  },
  {
    email: 'alemao@oficina.com',
    nome: 'Mecânica Alemão & Especialistas',
    senhaPadrao: '123456',
    oficinaId: '22222222-2222-2222-2222-222222222222',
  },
  {
    email: 'cartech@oficina.com',
    nome: 'CarTech Performance',
    senhaPadrao: '123456',
    oficinaId: '33333333-3333-3333-3333-333333333333',
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

// Realizar Login
export async function loginOficina(
  email: string,
  password: string
): Promise<{ success: boolean; oficina?: Oficina; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Tentar autenticação via Supabase se configurado
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.user) {
        // Buscar dados da oficina vinculada ao usuário por user_id ou email
        const { data: oficinaData } = await supabase
          .from('oficinas')
          .select('*')
          .or(`user_id.eq.${data.user.id},email.eq.${cleanEmail}`)
          .single();

        if (oficinaData) {
          const oficina = oficinaData as Oficina;
          setCurrentOficina(oficina);
          return { success: true, oficina };
        }
      }
    } catch (e) {
      console.warn('Erro ao autenticar com Supabase Auth, tentando contas demo locais:', e);
    }
  }

  // 2. Validação local com oficinas demo
  const allOficinas = await fetchOficinas();
  const matchedDemo = DEMO_ACCOUNTS.find((acc) => acc.email === cleanEmail);

  if (matchedDemo) {
    if (password !== matchedDemo.senhaPadrao) {
      return { success: false, error: 'Senha incorreta para esta oficina.' };
    }

    const oficina = allOficinas.find((of) => of.id === matchedDemo.oficinaId) || {
      id: matchedDemo.oficinaId,
      nome: matchedDemo.nome,
      whatsapp: '5511999998888',
      email: matchedDemo.email,
    };

    setCurrentOficina(oficina);
    return { success: true, oficina };
  }

  // Verificação direta por e-mail nas oficinas
  const foundOficina = allOficinas.find(
    (of) => of.email?.toLowerCase() === cleanEmail || of.nome.toLowerCase().includes(cleanEmail.split('@')[0])
  );

  if (foundOficina && password.length >= 4) {
    setCurrentOficina(foundOficina);
    return { success: true, oficina: foundOficina };
  }

  return {
    success: false,
    error: 'Credenciais inválidas. Verifique o e-mail ou utilize uma das contas de teste.',
  };
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
