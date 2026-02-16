
import { createClient } from '@supabase/supabase-js';

/**
 * Função utilitária para buscar variáveis de ambiente de forma robusta
 */
const getEnv = (name: string): string | undefined => {
  // 1. Tenta via process.env
  if (typeof process !== 'undefined' && process.env?.[name]) {
    const val = process.env[name];
    if (val && val !== 'undefined' && val !== 'null' && val.trim() !== '') return val;
  }
  // 2. Tenta via import.meta.env (Vite)
  try {
    const val = (import.meta as any).env?.[name];
    if (val && val !== 'undefined' && val !== 'null' && val.trim() !== '') return val;
  } catch (e) {}
  
  // 3. Tenta via globalThis (Browser environment)
  try {
    const val = (globalThis as any).VITE_SUPABASE_URL || (globalThis as any).VITE_SUPABASE_ANON_KEY;
    if (name === 'VITE_SUPABASE_URL' && typeof (globalThis as any).VITE_SUPABASE_URL === 'string') return (globalThis as any).VITE_SUPABASE_URL;
    if (name === 'VITE_SUPABASE_ANON_KEY' && typeof (globalThis as any).VITE_SUPABASE_ANON_KEY === 'string') return (globalThis as any).VITE_SUPABASE_ANON_KEY;
  } catch (e) {}

  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

/**
 * Verificação rigorosa.
 */
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  supabaseUrl.includes('.supabase.co')
);

if (!isSupabaseConfigured) {
  console.warn("[Supabase] Credenciais não encontradas. O sistema operará em Modo Local (IndexedDB).");
}

/**
 * Exportação segura do cliente.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'channel') {
          return () => ({
            on: () => ({
              subscribe: () => ({})
            })
          });
        }
        return () => {
          throw new Error("Supabase não configurado. Verifique as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        };
      }
    });
